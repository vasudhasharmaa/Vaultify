const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    yearsOwned: {
      type: Number,
      default: 0,
    },
    repairsCount: {
      type: Number,
      default: 0,
    },
    partsReplaced: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['transfer', 'share'],
      default: 'transfer',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
