const express = require('express');
const router = express.Router();
const NFT = require('../models/NFT');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Tier pricing
const MINT_PRICES = { common: 0.01, rare: 0.05, epic: 0.15, legendary: 0.5 };
const TIER_NAMES = {
  common: 'Moondog Common',
  rare: 'Moondog Rare',
  epic: 'Moondog Epic',
  legendary: 'Moondog Legendary'
};

// @route   GET /api/nfts
// @desc    Get all NFTs (public gallery)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { tier, page = 1, limit = 12, sort = '-mintedAt' } = req.query;
    const filter = {};
    if (tier) filter.tier = tier;

    const nfts = await NFT.find(filter)
      .populate('owner', 'username walletAddress profileImage')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await NFT.countDocuments(filter);

    res.json({
      success: true,
      count: nfts.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
      nfts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/nfts/:id
// @desc    Get single NFT
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const nft = await NFT.findById(req.params.id).populate('owner', 'username walletAddress');
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found.' });
    res.json({ success: true, nft });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/nfts/mint
// @desc    Mint a new NFT
// @access  Private
router.post('/mint', protect, async (req, res) => {
  try {
    const { tier = 'common' } = req.body;

    if (!['common', 'rare', 'epic', 'legendary'].includes(tier)) {
      return res.status(400).json({ success: false, message: 'Invalid NFT tier.' });
    }

    // Check membership limits
    const user = await User.findById(req.user._id).populate('nfts');
    const monthlyMints = user.nfts.filter(nft => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return nft.mintedAt > oneMonthAgo;
    }).length;

    const mintLimits = { none: 1, starter: 5, gold: 20, diamond: Infinity };
    const userLimit = mintLimits[user.membership.tier] || 1;

    if (monthlyMints >= userLimit) {
      return res.status(403).json({
        success: false,
        message: `Monthly mint limit reached (${userLimit}). Upgrade your membership for more mints.`
      });
    }

    // Create NFT
    const nft = await NFT.create({
      name: `${TIER_NAMES[tier]} #${Date.now().toString().slice(-5)}`,
      description: `A ${tier} Moondog NFT — part of the exclusive MoondogAI collection.`,
      tier,
      owner: req.user._id,
      mintPrice: MINT_PRICES[tier],
      image: `https://via.placeholder.com/400x400/060B18/00E5FF?text=Moondog+${tier.toUpperCase()}`
    });

    // Add to user's NFTs
    user.nfts.push(nft._id);
    user.points += tier === 'legendary' ? 500 : tier === 'epic' ? 200 : tier === 'rare' ? 100 : 50;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: `🎉 Successfully minted ${nft.name}!`,
      nft,
      newPoints: user.points
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/nfts/user/my-nfts
// @desc    Get current user's NFTs
// @access  Private
router.get('/user/my-nfts', protect, async (req, res) => {
  try {
    const nfts = await NFT.find({ owner: req.user._id }).sort('-mintedAt');
    res.json({ success: true, count: nfts.length, nfts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/nfts/:id/list
// @desc    List NFT for sale
// @access  Private
router.put('/:id/list', protect, async (req, res) => {
  try {
    const { price } = req.body;
    const nft = await NFT.findOne({ _id: req.params.id, owner: req.user._id });
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found or not yours.' });

    nft.isListed = true;
    nft.listPrice = price;
    await nft.save();

    res.json({ success: true, message: 'NFT listed for sale!', nft });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/nfts/:id/unlist
// @desc    Remove NFT from sale
// @access  Private
router.put('/:id/unlist', protect, async (req, res) => {
  try {
    const nft = await NFT.findOne({ _id: req.params.id, owner: req.user._id });
    if (!nft) return res.status(404).json({ success: false, message: 'NFT not found or not yours.' });

    nft.isListed = false;
    nft.listPrice = undefined;
    await nft.save();

    res.json({ success: true, message: 'NFT removed from sale.', nft });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
