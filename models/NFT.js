const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const nftSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  image: {
    type: String,
    default: 'https://via.placeholder.com/400x400/060B18/00E5FF?text=MoondogAI+NFT'
  },
  tier: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  traits: [{
    trait_type: String,
    value: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mintedAt: {
    type: Date,
    default: Date.now
  },
  mintPrice: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'ETH'
  },
  blockchain: {
    type: String,
    default: 'Ethereum'
  },
  contractAddress: {
    type: String,
    default: '0x0000000000000000000000000000000000000000'
  },
  transactionHash: {
    type: String,
    default: () => '0x' + [...Array(64)].map(() => Math.floor(Math.random()*16).toString(16)).join('')
  },
  isListed: {
    type: Boolean,
    default: false
  },
  listPrice: Number,
  transferHistory: [{
    from: String,
    to: String,
    date: { type: Date, default: Date.now },
    txHash: String
  }]
});

// Generate random traits on creation
nftSchema.pre('save', function(next) {
  if (this.isNew && this.traits.length === 0) {
    const backgrounds = ['Cyber City', 'Neon Void', 'Moon Surface', 'Digital Space', 'Hologram'];
    const accessories = ['Gold Chain', 'Laser Eyes', 'Crown', 'Headphones', 'Cape'];
    const moods = ['Legendary', 'Fierce', 'Cool', 'Mystic', 'Epic'];
    this.traits = [
      { trait_type: 'Background', value: backgrounds[Math.floor(Math.random() * backgrounds.length)] },
      { trait_type: 'Accessory', value: accessories[Math.floor(Math.random() * accessories.length)] },
      { trait_type: 'Mood', value: moods[Math.floor(Math.random() * moods.length)] }
    ];
  }
  next();
});

module.exports = mongoose.model('NFT', nftSchema);
