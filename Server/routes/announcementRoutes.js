const express = require('express');
const Announcement = require('../models/Announcement');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// POST /api/announcements (Faculty only)
router.post('/', restrictTo('Faculty'), async (req, res) => {
  try {
    const { title, body, priority = 'normal', department } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    const announcement = await Announcement.create({
      title,
      body,
      priority,
      department: department || req.user.department || 'General',
      postedBy: req.user._id,
    });

    const populated = await announcement.populate('postedBy', 'name department');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/announcements?department=CSE
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) {
      filter.department = req.query.department;
    }

    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('postedBy', 'name department');

    res.status(200).json({ success: true, count: announcements.length, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/announcements/:id (Faculty only, own posts only)
router.delete('/:id', restrictTo('Faculty'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    if (announcement.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own announcements.' });
    }

    await announcement.deleteOne();
    res.status(200).json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

