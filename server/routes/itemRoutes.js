const express = require('express');
const db = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

function parseParentId(rawParentId) {
  if (
    rawParentId === undefined ||
    rawParentId === null ||
    rawParentId === '' ||
    rawParentId === 'root'
  ) {
    return null;
  }

  const parentId = Number(rawParentId);

  if (!Number.isInteger(parentId) || parentId <= 0) {
    return 'INVALID';
  }

  return parentId;
}

function validateTitle(title) {
  return typeof title === 'string' && title.trim().length > 0;
}

async function parentBelongsToUser(parentId, userId) {
  if (parentId === null) {
    return true;
  }

  const [parents] = await db.query(
    'SELECT id FROM hyper_items WHERE id = ? AND user_id = ?',
    [parentId, userId]
  );

  return parents.length > 0;
}

router.get('/items', requireAuth, async (req, res) => {
  try {
    const parentId = parseParentId(req.query.parentId);

    if (parentId === 'INVALID') {
      return res.status(400).json({ error: 'Invalid parentId.' });
    }

    let query;
    let params;

    if (parentId === null) {
      query = `
        SELECT
          item.id,
          item.parent_id,
          item.title,
          item.description,
          item.created_at,
          item.updated_at,
          (
            SELECT COUNT(*)
            FROM hyper_items AS child
            WHERE child.parent_id = item.id
              AND child.user_id = item.user_id
          ) AS child_count
        FROM hyper_items AS item
        WHERE item.user_id = ?
          AND item.parent_id IS NULL
        ORDER BY item.updated_at DESC
      `;
      params = [req.session.userId];
    } else {
      query = `
        SELECT
          item.id,
          item.parent_id,
          item.title,
          item.description,
          item.created_at,
          item.updated_at,
          (
            SELECT COUNT(*)
            FROM hyper_items AS child
            WHERE child.parent_id = item.id
              AND child.user_id = item.user_id
          ) AS child_count
        FROM hyper_items AS item
        WHERE item.user_id = ?
          AND item.parent_id = ?
        ORDER BY item.updated_at DESC
      `;
      params = [req.session.userId, parentId];
    }

    const [items] = await db.query(query, params);

    res.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items.' });
  }
});

router.get('/items/:id', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    const [items] = await db.query(
      `
        SELECT
          item.id,
          item.parent_id,
          item.title,
          item.description,
          item.created_at,
          item.updated_at,
          (
            SELECT COUNT(*)
            FROM hyper_items AS child
            WHERE child.parent_id = item.id
              AND child.user_id = item.user_id
          ) AS child_count
        FROM hyper_items AS item
        WHERE item.id = ?
          AND item.user_id = ?
      `,
      [itemId, req.session.userId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    res.json(items[0]);
  } catch (error) {
    console.error('Get single item error:', error);
    res.status(500).json({ error: 'Failed to fetch item.' });
  }
});

router.post('/items', requireAuth, async (req, res) => {
  try {
    const { parent_id, title, description } = req.body;
    const parsedParentId = parseParentId(parent_id);

    if (parsedParentId === 'INVALID') {
      return res.status(400).json({ error: 'Invalid parent_id.' });
    }

    if (!validateTitle(title)) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const parentIsValid = await parentBelongsToUser(
      parsedParentId,
      req.session.userId
    );

    if (!parentIsValid) {
      return res.status(404).json({ error: 'Parent item not found.' });
    }

    const [result] = await db.query(
      `
        INSERT INTO hyper_items (user_id, parent_id, title, description)
        VALUES (?, ?, ?, ?)
      `,
      [
        req.session.userId,
        parsedParentId,
        title.trim(),
        description || ''
      ]
    );

    const [newItem] = await db.query(
      `
        SELECT
          item.id,
          item.parent_id,
          item.title,
          item.description,
          item.created_at,
          item.updated_at,
          0 AS child_count
        FROM hyper_items AS item
        WHERE item.id = ?
          AND item.user_id = ?
      `,
      [result.insertId, req.session.userId]
    );

    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item.' });
  }
});

router.put('/items/:id', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { title, description } = req.body;

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    if (!validateTitle(title)) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const [result] = await db.query(
      `
        UPDATE hyper_items
        SET title = ?, description = ?
        WHERE id = ?
          AND user_id = ?
      `,
      [
        title.trim(),
        description || '',
        itemId,
        req.session.userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const [updatedItem] = await db.query(
      `
        SELECT
          item.id,
          item.parent_id,
          item.title,
          item.description,
          item.created_at,
          item.updated_at,
          (
            SELECT COUNT(*)
            FROM hyper_items AS child
            WHERE child.parent_id = item.id
              AND child.user_id = item.user_id
          ) AS child_count
        FROM hyper_items AS item
        WHERE item.id = ?
          AND item.user_id = ?
      `,
      [itemId, req.session.userId]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item.' });
  }
});

router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    const [result] = await db.query(
      `
        DELETE FROM hyper_items
        WHERE id = ?
          AND user_id = ?
      `,
      [itemId, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

module.exports = router;