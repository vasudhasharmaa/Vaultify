const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      default: 'General',
    },
    price: {
      type: Number,
      default: 0,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    purchaseLocation: {
      type: String,
      trim: true,
    },
    receiptImage: {
      type: String, // Store base64 data for simplicity and local testing
    },
    productImage: {
      type: String, // Store base64 data
    },
    warranty: {
      totalWarranties: {
        type: Number,
        default: 1, // e.g., number of claims available
      },
      warrantiesUsed: {
        type: Number,
        default: 0,
      },
      warrantiesRemaining: {
        type: Number,
        default: 1,
      },
      startDate: {
        type: Date,
      },
      expiryDate: {
        type: Date,
      },
    },
    repairs: [
      {
        repairDate: {
          type: Date,
          default: Date.now,
        },
        description: {
          type: String,
          required: true,
        },
        partsChanged: {
          type: String,
        },
        cost: {
          type: Number,
          default: 0,
        },
        notes: {
          type: String,
        },
      },
    ],
    manual: {
      url: {
        type: String,
      },
      content: {
        type: String,
      },
      neverOpened: {
        type: Boolean,
        default: true,
      },
    },
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    timeline: [
      {
        event: {
          type: String,
          required: true, // e.g. 'Purchased', 'Warranty Claimed', 'Repaired', 'Shared', 'Transferred'
        },
        date: {
          type: Date,
          default: Date.now,
        },
        description: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
