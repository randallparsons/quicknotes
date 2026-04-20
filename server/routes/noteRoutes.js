const express = require('express');
const db = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/notes', requireAuth, async (req, res) => {
  try {
    const [notes] = await db.query(
      'SELECT id, title, body, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
      [req.session.userId]
    );

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.get('/notes/:id', requireAuth, async (req, res) => {
  try {
    const [notes] = await db.query(
      'SELECT id, title, body, updated_at FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (notes.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(notes[0]);
  } catch (error) {
    console.error('Get single note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

router.post('/notes', requireAuth, async (req, res) => {
  try {
    const { title, body } = req.body;

    const [result] = await db.query(
      'INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)',
      [
        req.session.userId,
        title || 'Untitled Note',
        body || ''
      ]
    );

    const [newNote] = await db.query(
      'SELECT id, title, body, updated_at FROM notes WHERE id = ? AND user_id = ?',
      [result.insertId, req.session.userId]
    );

    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/notes/:id', requireAuth, async (req, res) => {
  try {
    const { title, body } = req.body;

    const [result] = await db.query(
      'UPDATE notes SET title = ?, body = ? WHERE id = ? AND user_id = ?',
      [
        title || 'Untitled Note',
        body || '',
        req.params.id,
        req.session.userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const [updatedNote] = await db.query(
      'SELECT id, title, body, updated_at FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    res.json(updatedNote[0]);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/notes/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;