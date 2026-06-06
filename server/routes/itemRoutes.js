const express = require('express');
const db = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

function normalizeParentId(parentId) {
  if (
    parentId === undefined ||
    parentId === null ||
    parentId === '' ||
    parentId === 'root' ||
    parentId === 'null'
  ) {
    return null;
  }

  return parentId;
}

async function getSiblingItems(userId, parentId) {
  let query;
  let params;

  if (parentId === null) {
    query = `
      SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
      FROM hyper_items
      WHERE user_id = ? AND parent_id IS NULL
      ORDER BY sort_order ASC, created_at ASC, id ASC
    `;
    params = [userId];
  } else {
    query = `
      SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
      FROM hyper_items
      WHERE user_id = ? AND parent_id = ?
      ORDER BY sort_order ASC, created_at ASC, id ASC
    `;
    params = [userId, parentId];
  }

  const [items] = await db.query(query, params);
  return items;
}

// GET /api/items
// Optional: /api/items?parentId=14
// Optional root forms: /api/items, /api/items?parentId=root, /api/items?parentId=null
router.get('/items', requireAuth, async (req, res) => {
  try {
    const parentId = normalizeParentId(req.query.parentId);

    let query;
    let params;

    if (parentId === null) {
      query = `
        SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
        FROM hyper_items
        WHERE user_id = ? AND parent_id IS NULL
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `;
      params = [req.session.userId];
    } else {
      query = `
        SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
        FROM hyper_items
        WHERE user_id = ? AND parent_id = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC
      `;
      params = [req.session.userId, parentId];
    }

    const [items] = await db.query(query, params);

    res.json(items);
  } catch (error) {
    console.error('Get HyperList items error:', error);
    res.status(500).json({ error: 'Failed to fetch HyperList items' });
  }
});

// GET /api/items/:id
router.get('/items/:id', requireAuth, async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
       FROM hyper_items
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'HyperList item not found' });
    }

    res.json(items[0]);
  } catch (error) {
    console.error('Get single HyperList item error:', error);
    res.status(500).json({ error: 'Failed to fetch HyperList item' });
  }
});

// GET /api/current-item
router.get('/current-item', requireAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT last_current_item_id FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (users.length === 0 || !users[0].last_current_item_id) {
      return res.json({ item: null });
    }

    const savedItemId = users[0].last_current_item_id;

    const [items] = await db.query(
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
       FROM hyper_items
       WHERE id = ? AND user_id = ?`,
      [savedItemId, req.session.userId]
    );

    if (items.length === 0) {
      await db.query(
        'UPDATE users SET last_current_item_id = NULL WHERE id = ?',
        [req.session.userId]
      );

      return res.json({
        item: null,
        message: 'Saved Current Working Item no longer exists.'
      });
    }

    res.json({ item: items[0] });
  } catch (error) {
    console.error('Get Current Working Item error:', error);
    res.status(500).json({ error: 'Failed to load Current Working Item' });
  }
});

// PATCH /api/current-item
router.patch('/current-item', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      await db.query(
        'UPDATE users SET last_current_item_id = NULL WHERE id = ?',
        [req.session.userId]
      );

      return res.json({
        message: 'Current Working Item cleared.',
        item: null
      });
    }

    const [items] = await db.query(
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
       FROM hyper_items
       WHERE id = ? AND user_id = ?`,
      [itemId, req.session.userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'HyperList item not found' });
    }

    await db.query(
      'UPDATE users SET last_current_item_id = ? WHERE id = ?',
      [itemId, req.session.userId]
    );

    res.json({
      message: 'Current Working Item saved.',
      item: items[0]
    });
  } catch (error) {
    console.error('Save Current Working Item error:', error);
    res.status(500).json({ error: 'Failed to save Current Working Item' });
  }
});

// POST /api/items
router.post('/items', requireAuth, async (req, res) => {
  try {
    const { title, description, parentId } = req.body;
    const normalizedParentId = normalizeParentId(parentId);

    if (normalizedParentId !== null) {
      const [parents] = await db.query(
        'SELECT id FROM hyper_items WHERE id = ? AND user_id = ?',
        [normalizedParentId, req.session.userId]
      );

      if (parents.length === 0) {
        return res.status(404).json({ error: 'Parent HyperList item not found' });
      }
    }

    let nextOrderQuery;
    let nextOrderParams;

    if (normalizedParentId === null) {
      nextOrderQuery = `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order
        FROM hyper_items
        WHERE user_id = ? AND parent_id IS NULL
      `;
      nextOrderParams = [req.session.userId];
    } else {
      nextOrderQuery = `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order
        FROM hyper_items
        WHERE user_id = ? AND parent_id = ?
      `;
      nextOrderParams = [req.session.userId, normalizedParentId];
    }

    const [orderRows] = await db.query(nextOrderQuery, nextOrderParams);
    const nextSortOrder = orderRows[0].next_sort_order;

    const [result] = await db.query(
      `INSERT INTO hyper_items (user_id, parent_id, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        normalizedParentId,
        title || 'Untitled Item',
        description || '',
        nextSortOrder
      ]
    );

    const [newItem] = await db.query(
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
       FROM hyper_items
       WHERE id = ? AND user_id = ?`,
      [result.insertId, req.session.userId]
    );

    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Create HyperList item error:', error);
    res.status(500).json({ error: 'Failed to create HyperList item' });
  }
});

// PATCH /api/items/:id/move
router.patch('/items/:id/move', requireAuth, async (req, res) => {
  try {
    const { direction } = req.body;

    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({ error: 'Direction must be "up" or "down"' });
    }

    const [items] = await db.query(
      `SELECT id, user_id, parent_id, sort_order
       FROM hyper_items
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'HyperList item not found' });
    }

    const item = items[0];

    let neighborQuery;
    let neighborParams;

    if (item.parent_id === null) {
      if (direction === 'up') {
        neighborQuery = `
          SELECT id, sort_order
          FROM hyper_items
          WHERE user_id = ?
            AND parent_id IS NULL
            AND sort_order < ?
          ORDER BY sort_order DESC, created_at DESC, id DESC
          LIMIT 1
        `;
      } else {
        neighborQuery = `
          SELECT id, sort_order
          FROM hyper_items
          WHERE user_id = ?
            AND parent_id IS NULL
            AND sort_order > ?
          ORDER BY sort_order ASC, created_at ASC, id ASC
          LIMIT 1
        `;
      }

      neighborParams = [req.session.userId, item.sort_order];
    } else {
      if (direction === 'up') {
        neighborQuery = `
          SELECT id, sort_order
          FROM hyper_items
          WHERE user_id = ?
            AND parent_id = ?
            AND sort_order < ?
          ORDER BY sort_order DESC, created_at DESC, id DESC
          LIMIT 1
        `;
      } else {
        neighborQuery = `
          SELECT id, sort_order
          FROM hyper_items
          WHERE user_id = ?
            AND parent_id = ?
            AND sort_order > ?
          ORDER BY sort_order ASC, created_at ASC, id ASC
          LIMIT 1
        `;
      }

      neighborParams = [req.session.userId, item.parent_id, item.sort_order];
    }

    const [neighbors] = await db.query(neighborQuery, neighborParams);

    if (neighbors.length === 0) {
      const siblingItems = await getSiblingItems(req.session.userId, item.parent_id);

      return res.json({
        message: `Item is already at the ${direction === 'up' ? 'top' : 'bottom'} of this list`,
        items: siblingItems
      });
    }

    const neighbor = neighbors[0];

    await db.query(
      `UPDATE hyper_items
       SET sort_order = ?
       WHERE id = ? AND user_id = ?`,
      [neighbor.sort_order, item.id, req.session.userId]
    );

    await db.query(
      `UPDATE hyper_items
       SET sort_order = ?
       WHERE id = ? AND user_id = ?`,
      [item.sort_order, neighbor.id, req.session.userId]
    );

    const siblingItems = await getSiblingItems(req.session.userId, item.parent_id);

    res.json({
      message: `Item moved ${direction}`,
      movedItemId: item.id,
      swappedWithId: neighbor.id,
      items: siblingItems
    });
  } catch (error) {
    console.error('Move HyperList item error:', error);
    res.status(500).json({ error: 'Failed to move HyperList item' });
  }
});

// PUT /api/items/:id
router.put('/items/:id', requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;

    const [result] = await db.query(
      `UPDATE hyper_items
       SET title = ?, description = ?
       WHERE id = ? AND user_id = ?`,
      [
        title || 'Untitled Item',
        description || '',
        req.params.id,
        req.session.userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'HyperList item not found' });
    }

    const [updatedItem] = await db.query(
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at, sort_order
       FROM hyper_items
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    console.error('Update HyperList item error:', error);
    res.status(500).json({ error: 'Failed to update HyperList item' });
  }
});

// DELETE /api/items/:id
router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM hyper_items WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'HyperList item not found' });
    }

    res.json({ message: 'HyperList item deleted successfully' });
  } catch (error) {
    console.error('Delete HyperList item error:', error);
    res.status(500).json({ error: 'Failed to delete HyperList item' });
  }
});

module.exports = router;