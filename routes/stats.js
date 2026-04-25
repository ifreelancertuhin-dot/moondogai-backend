const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NFT = require('../models/NFT');
const Membership = require('../models/Membership');

// @route   GET /api/stats/public
// @desc    Get public platform statistics
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const [totalUsers, totalNFTs, activeMemberships, totalVolume] = await Promise.all([
      User.countDocuments({ isActive: true }),
      NFT.countDocuments(),
      Membership.countDocuments({ status: 'active' }),
      NFT.aggregate([{ $group: { _id: null, total: { $sum: '$mintPrice' } } }])
    ]);

    const volume = totalVolume[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalNFTs,
        activeMemberships,
        tradingVolume: volume.toFixed(4),
        tradingVolumeUSD: (volume * 2000).toFixed(0) // approximate ETH to USD
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
