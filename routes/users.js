const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NFT = require('../models/NFT');
const { protect } = require('../middleware/auth');

// @route   GET /api/users/profile
// @desc    Get logged-in user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('nfts');
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, bio, profileImage } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (profileImage) updates.profileImage = profileImage;

    // Check username uniqueness
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username already taken.' });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true
    }).populate('nfts');

    res.json({ success: true, message: 'Profile updated!', user: user.getPublicProfile() });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   GET /api/users/:username
// @desc    Get public user profile
// @access  Public
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).populate('nfts');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Return limited public info
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        walletAddress: user.walletAddress,
        profileImage: user.profileImage,
        bio: user.bio,
        points: user.points,
        membership: { tier: user.membership.tier, isActive: user.membership.isActive },
        nftCount: user.nfts.length,
        joinedAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/users/leaderboard/top
// @desc    Get top users by points
// @access  Public
router.get('/leaderboard/top', async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('username profileImage points membership nfts')
      .sort('-points')
      .limit(10);

    res.json({ success: true, leaderboard: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
