const express = require('express');
const router = express.Router();
const Membership = require('../models/Membership');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const PLANS = {
  starter: { price: 29, name: 'Starter', duration: 30 },
  gold: { price: 79, name: 'Gold', duration: 30 },
  diamond: { price: 149, name: 'Diamond', duration: 30 }
};

// @route   GET /api/memberships/plans
// @desc    Get all membership plans
// @access  Public
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        tier: 'starter',
        name: 'Starter',
        price: 29,
        currency: 'USD',
        duration: '30 days',
        features: ['AI Chat Access', '5 NFT Mints/month', 'Basic Analytics', 'Community Access'],
        popular: false
      },
      {
        tier: 'gold',
        name: 'Gold',
        price: 79,
        currency: 'USD',
        duration: '30 days',
        features: ['Everything in Starter', '20 NFT Mints/month', 'Advanced AI Tools', 'Priority Support', 'Exclusive Discord'],
        popular: true
      },
      {
        tier: 'diamond',
        name: 'Diamond',
        price: 149,
        currency: 'USD',
        duration: '30 days',
        features: ['Everything in Gold', 'Unlimited NFT Mints', 'All AI Tools', '1-on-1 Mentorship', 'Revenue Share', 'Early Access'],
        popular: false
      }
    ]
  });
});

// @route   POST /api/memberships/subscribe
// @desc    Subscribe to a membership tier
// @access  Private
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { tier, paymentMethod = 'card' } = req.body;

    if (!PLANS[tier]) {
      return res.status(400).json({ success: false, message: 'Invalid membership tier.' });
    }

    const plan = PLANS[tier];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Cancel existing active membership
    await Membership.updateMany(
      { user: req.user._id, status: 'active' },
      { status: 'cancelled' }
    );

    // Create new membership record
    const membership = await Membership.create({
      user: req.user._id,
      tier,
      price: plan.price,
      endDate,
      paymentMethod,
      status: 'active'
    });

    // Update user's membership
    await User.findByIdAndUpdate(req.user._id, {
      'membership.tier': tier,
      'membership.startDate': new Date(),
      'membership.endDate': endDate,
      'membership.isActive': true
    });

    res.status(201).json({
      success: true,
      message: `🎉 Welcome to ${plan.name} membership!`,
      membership,
      expiresAt: endDate
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/memberships/my-membership
// @desc    Get current user's membership
// @access  Private
router.get('/my-membership', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const history = await Membership.find({ user: req.user._id }).sort('-createdAt').limit(5);

    // Check if membership expired
    if (user.membership.isActive && user.membership.endDate < new Date()) {
      await User.findByIdAndUpdate(req.user._id, {
        'membership.isActive': false,
        'membership.tier': 'none'
      });
      user.membership.isActive = false;
      user.membership.tier = 'none';
    }

    res.json({
      success: true,
      membership: user.membership,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/memberships/cancel
// @desc    Cancel membership
// @access  Private
router.delete('/cancel', protect, async (req, res) => {
  try {
    await Membership.updateMany(
      { user: req.user._id, status: 'active' },
      { status: 'cancelled' }
    );
    await User.findByIdAndUpdate(req.user._id, {
      'membership.isActive': false,
      'membership.tier': 'none'
    });
    res.json({ success: true, message: 'Membership cancelled. Access continues until expiry.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
