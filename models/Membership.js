const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tier: {
    type: String,
    enum: ['starter', 'gold', 'diamond'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'card', 'nft'],
    default: 'card'
  },
  transactionId: {
    type: String,
    default: () => 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  features: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Set features based on tier
membershipSchema.pre('save', function(next) {
  const tierFeatures = {
    starter: ['AI Chat Access', '5 NFT Mints/month', 'Basic Analytics', 'Community Access'],
    gold: ['Everything in Starter', '20 NFT Mints/month', 'Advanced AI Tools', 'Priority Support', 'Exclusive Discord'],
    diamond: ['Everything in Gold', 'Unlimited NFT Mints', 'All AI Tools', '1-on-1 Mentorship', 'Revenue Share', 'Early Access']
  };
  if (this.isNew) {
    this.features = tierFeatures[this.tier] || [];
  }
  next();
});

module.exports = mongoose.model('Membership', membershipSchema);
