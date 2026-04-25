const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NFT = require('../models/NFT');
const Membership = require('../models/Membership');
const { protect, restrictTo } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(protect, restrictTo('admin'));

// @route   GET /api/admin/dashboard
// @desc    Admin dashboard stats
// @access  Admin
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      newUsersToday,
      totalNFTs,
      nftsMintedToday,
      activeMembers,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      NFT.countDocuments(),
      NFT.countDocuments({ mintedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Membership.countDocuments({ status: 'active' }),
      Membership.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, total: { $sum: '$price' } } }])
    ]);

    const tierBreakdown = await Membership.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$tier', count: { $sum: 1 }, revenue: { $sum: '$price' } } }
    ]);

    res.json({
      success: true,
      dashboard: {
        totalUsers,
        newUsersToday,
        totalNFTs,
        nftsMintedToday,
        activeMembers,
        totalRevenue: totalRevenue[0]?.total || 0,
        membershipBreakdown: tierBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (paginated)
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, membership } = req.query;
    const filter = {};
    if (search) filter.$or = [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (role) filter.role = role;
    if (membership) filter['membership.tier'] = membership;

    const users = await User.find(filter)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/users/:id/toggle
// @desc    Activate/deactivate user
// @access  Admin
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot modify admin accounts.' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Change user role
// @access  Admin
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `User role updated to ${role}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/nfts
// @desc    Get all NFTs
// @access  Admin
router.get('/nfts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const nfts = await NFT.find()
      .populate('owner', 'username email')
      .sort('-mintedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await NFT.countDocuments();
    res.json({ success: true, nfts, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
