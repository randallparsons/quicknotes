const express = require('express');
const db = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

/*
  GET /api/social/users
  Lists other users and shows whether the current user follows them.
*/
router.get('/social/users', requireAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      `
      SELECT
        u.id,
        u.email,
        CASE
          WHEN f.id IS NULL THEN false
          ELSE true
        END AS is_following
      FROM users u
      LEFT JOIN follows f
        ON f.following_id = u.id
        AND f.follower_id = ?
      WHERE u.id <> ?
      ORDER BY u.email ASC
      `,
      [req.session.userId, req.session.userId]
    );

    res.json(users);
  } catch (error) {
    console.error('Get social users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/*
  POST /api/social/follow/:userId
  Current user follows another user.
*/
router.post('/social/follow/:userId', requireAuth, async (req, res) => {
  try {
    const followerId = req.session.userId;
    const followingId = Number(req.params.userId);

    if (!followingId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const [targetUsers] = await db.query(
      'SELECT id, email FROM users WHERE id = ?',
      [followingId]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query(
      `
      INSERT IGNORE INTO follows (follower_id, following_id)
      VALUES (?, ?)
      `,
      [followerId, followingId]
    );

    res.status(201).json({
      message: 'User followed successfully',
      following: targetUsers[0]
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

/*
  DELETE /api/social/follow/:userId
  Current user unfollows another user.
*/
router.delete('/social/follow/:userId', requireAuth, async (req, res) => {
  try {
    const followerId = req.session.userId;
    const followingId = Number(req.params.userId);

    if (!followingId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await db.query(
      `
      DELETE FROM follows
      WHERE follower_id = ?
      AND following_id = ?
      `,
      [followerId, followingId]
    );

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

/*
  GET /api/social/following
  Lists users the current user follows.
*/
router.get('/social/following', requireAuth, async (req, res) => {
  try {
    const [following] = await db.query(
      `
      SELECT
        u.id,
        u.email,
        f.created_at AS followed_at
      FROM follows f
      JOIN users u
        ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      `,
      [req.session.userId]
    );

    res.json(following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to fetch following list' });
  }
});

/*
  GET /api/social/followers
  Lists users who follow the current user.
*/
router.get('/social/followers', requireAuth, async (req, res) => {
  try {
    const [followers] = await db.query(
      `
      SELECT
        u.id,
        u.email,
        f.created_at AS followed_at
      FROM follows f
      JOIN users u
        ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      `,
      [req.session.userId]
    );

    res.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to fetch followers list' });
  }
});

/*
  POST /api/items/:itemId/like
  Current user likes a HyperList item.
*/
router.post('/items/:itemId/like', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const userId = req.session.userId;

    if (!itemId) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const [items] = await db.query(
      'SELECT id FROM hyper_items WHERE id = ?',
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await db.query(
      `
      INSERT IGNORE INTO item_likes (item_id, user_id)
      VALUES (?, ?)
      `,
      [itemId, userId]
    );

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS like_count FROM item_likes WHERE item_id = ?',
      [itemId]
    );

    res.status(201).json({
      message: 'Item liked successfully',
      item_id: itemId,
      like_count: countRows[0].like_count,
      liked_by_current_user: true
    });
  } catch (error) {
    console.error('Like item error:', error);
    res.status(500).json({ error: 'Failed to like item' });
  }
});

/*
  DELETE /api/items/:itemId/like
  Current user removes their like from a HyperList item.
*/
router.delete('/items/:itemId/like', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const userId = req.session.userId;

    if (!itemId) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    await db.query(
      `
      DELETE FROM item_likes
      WHERE item_id = ?
      AND user_id = ?
      `,
      [itemId, userId]
    );

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS like_count FROM item_likes WHERE item_id = ?',
      [itemId]
    );

    res.json({
      message: 'Item unliked successfully',
      item_id: itemId,
      like_count: countRows[0].like_count,
      liked_by_current_user: false
    });
  } catch (error) {
    console.error('Unlike item error:', error);
    res.status(500).json({ error: 'Failed to unlike item' });
  }
});

/*
  GET /api/items/:itemId/likes
  Gets like count and whether current user liked the item.
*/
router.get('/items/:itemId/likes', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const userId = req.session.userId;

    if (!itemId) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS like_count FROM item_likes WHERE item_id = ?',
      [itemId]
    );

    const [currentUserLike] = await db.query(
      `
      SELECT id
      FROM item_likes
      WHERE item_id = ?
      AND user_id = ?
      `,
      [itemId, userId]
    );

    res.json({
      item_id: itemId,
      like_count: countRows[0].like_count,
      liked_by_current_user: currentUserLike.length > 0
    });
  } catch (error) {
    console.error('Get item likes error:', error);
    res.status(500).json({ error: 'Failed to fetch item likes' });
  }
});

/*
  GET /api/items/:itemId/comments
  Gets comments for a HyperList item.
*/
router.get('/items/:itemId/comments', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);

    if (!itemId) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const [comments] = await db.query(
      `
      SELECT
        c.id,
        c.item_id,
        c.user_id,
        u.email,
        c.comment_text,
        c.created_at
      FROM item_comments c
      JOIN users u
        ON u.id = c.user_id
      WHERE c.item_id = ?
      ORDER BY c.created_at ASC
      `,
      [itemId]
    );

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/*
  POST /api/items/:itemId/comments
  Adds a comment to a HyperList item.
*/
router.post('/items/:itemId/comments', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const userId = req.session.userId;
    const { comment_text } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const [items] = await db.query(
      'SELECT id FROM hyper_items WHERE id = ?',
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const [result] = await db.query(
      `
      INSERT INTO item_comments (item_id, user_id, comment_text)
      VALUES (?, ?, ?)
      `,
      [itemId, userId, comment_text.trim()]
    );

    const [newComment] = await db.query(
      `
      SELECT
        c.id,
        c.item_id,
        c.user_id,
        u.email,
        c.comment_text,
        c.created_at
      FROM item_comments c
      JOIN users u
        ON u.id = c.user_id
      WHERE c.id = ?
      `,
      [result.insertId]
    );

    res.status(201).json(newComment[0]);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

/*
  GET /api/feed
  Shows recent HyperList items from users the current user follows.
*/
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const [feedItems] = await db.query(
      `
      SELECT
        hi.id,
        hi.user_id,
        u.email AS owner_email,
        hi.parent_id,
        hi.title,
        hi.description,
        hi.created_at,
        hi.updated_at,
        COUNT(DISTINCT il.id) AS like_count,
        COUNT(DISTINCT ic.id) AS comment_count
      FROM follows f
      JOIN hyper_items hi
        ON hi.user_id = f.following_id
      JOIN users u
        ON u.id = hi.user_id
      LEFT JOIN item_likes il
        ON il.item_id = hi.id
      LEFT JOIN item_comments ic
        ON ic.item_id = hi.id
      WHERE f.follower_id = ?
      GROUP BY
        hi.id,
        hi.user_id,
        u.email,
        hi.parent_id,
        hi.title,
        hi.description,
        hi.created_at,
        hi.updated_at
      ORDER BY hi.updated_at DESC
      LIMIT 50
      `,
      [req.session.userId]
    );

    res.json(feedItems);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

module.exports = router;