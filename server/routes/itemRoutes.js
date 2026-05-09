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
        SELECT id, user_id, parent_id, title, description, created_at, updated_at
        FROM hyper_items
        WHERE user_id = ? AND parent_id IS NULL
        ORDER BY updated_at DESC
      `;
      params = [req.session.userId];
    } else {
      query = `
        SELECT id, user_id, parent_id, title, description, created_at, updated_at
        FROM hyper_items
        WHERE user_id = ? AND parent_id = ?
        ORDER BY updated_at DESC
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
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at
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

    const [result] = await db.query(
      `INSERT INTO hyper_items (user_id, parent_id, title, description)
       VALUES (?, ?, ?, ?)`,
      [
        req.session.userId,
        normalizedParentId,
        title || 'Untitled Item',
        description || ''
      ]
    );

    const [newItem] = await db.query(
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at
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
      `SELECT id, user_id, parent_id, title, description, created_at, updated_at
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