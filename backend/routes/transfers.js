const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const TransferRequest = require('../models/TransferRequest');
const auth = require('../middleware/auth');

// @route   POST /api/transfers
// @desc    Initiate an ownership transfer request
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { productId, recipientEmail, yearsOwned, repairsCount, partsReplaced, notes } = req.body;

    if (!productId || !recipientEmail) {
      return res.status(400).json({ message: 'Product ID and recipient email are required' });
    }

    // Verify product exists and belongs to the user
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the product owner can initiate a transfer' });
    }

    // Verify recipient user exists
    const recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
    if (!recipient) {
      return res.status(404).json({
        message: `Recipient email '${recipientEmail}' is not registered with Vaultify. The recipient must create an account first.`,
      });
    }

    if (recipient._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot transfer ownership to yourself' });
    }

    // Check if there is already a pending transfer request for this product
    const existingPending = await TransferRequest.findOne({
      product: productId,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({ message: 'A transfer request is already pending for this product' });
    }

    // Create transfer request
    const newRequest = new TransferRequest({
      product: productId,
      sender: req.user.id,
      recipientEmail: recipientEmail.toLowerCase(),
      yearsOwned: yearsOwned || 0,
      repairsCount: repairsCount || 0,
      partsReplaced: partsReplaced || '',
      notes: notes || '',
      status: 'pending',
    });

    await newRequest.save();

    // Add to timeline
    product.timeline.push({
      event: 'Ownership Transferred', // Categorized as timeline transfer
      date: new Date(),
      description: `Transfer initiated to ${recipient.name} (${recipient.email}). Pending acceptance.`,
    });
    await product.save();

    res.status(201).json({
      message: 'Transfer request sent successfully',
      transferRequest: newRequest,
    });
  } catch (error) {
    console.error('Initiate transfer error:', error);
    res.status(500).json({ message: 'Server error initiating transfer' });
  }
});

// @route   GET /api/transfers/pending
// @desc    Get all pending transfer requests for the logged-in user (as recipient)
// @access  Private
router.get('/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pendingTransfers = await TransferRequest.find({
      recipientEmail: user.email.toLowerCase(),
      status: 'pending',
    })
      .populate('product', 'name category price purchaseLocation')
      .populate('sender', 'name email');

    res.json(pendingTransfers);
  } catch (error) {
    console.error('Get pending transfers error:', error);
    res.status(500).json({ message: 'Server error retrieving pending transfers' });
  }
});

// @route   POST /api/transfers/:id/respond
// @desc    Accept or reject an ownership transfer request
// @access  Private
router.post('/:id/respond', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: "Action must be 'accept' or 'reject'" });
    }

    const transferRequest = await TransferRequest.findById(req.params.id);
    if (!transferRequest) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transferRequest.status !== 'pending') {
      return res.status(400).json({ message: 'This transfer request has already been processed' });
    }

    // Verify recipient
    const user = await User.findById(req.user.id);
    if (transferRequest.recipientEmail !== user.email.toLowerCase()) {
      return res.status(403).json({ message: 'You are not the authorized recipient of this transfer request' });
    }

    const product = await Product.findById(transferRequest.product);
    if (!product) {
      // Product might have been deleted by the owner
      transferRequest.status = 'rejected';
      await transferRequest.save();
      return res.status(404).json({ message: 'The product associated with this transfer request no longer exists' });
    }

    const senderUser = await User.findById(transferRequest.sender);

    if (action === 'accept') {
      if (transferRequest.type === 'share') {
        // Add recipient to product's sharedWith array if not already there
        if (!product.sharedWith.some((id) => id.toString() === req.user.id)) {
          product.sharedWith.push(req.user.id);
        }

        // Record in product timeline
        product.timeline.push({
          event: 'Shared',
          date: new Date(),
          description: `Shared access accepted by ${user.name}.`,
        });

        await product.save();

        // Update request status
        transferRequest.status = 'accepted';
        await transferRequest.save();

        res.json({
          message: 'Product sharing accepted successfully',
          product,
        });
      } else {
        // Transfer product owner to recipient
        const oldOwnerId = product.owner;
        product.owner = req.user.id;

        // Revoke any sharing to clean up permissions
        product.sharedWith = product.sharedWith.filter((id) => id.toString() !== req.user.id);

        // Record in product timeline
        product.timeline.push({
          event: 'Ownership Transferred',
          date: new Date(),
          description: `Ownership accepted by ${user.name}. Transferred from ${senderUser ? senderUser.name : 'previous owner'}. Product history: ${transferRequest.yearsOwned} years owned, ${transferRequest.repairsCount} repairs completed.`,
        });

        await product.save();

        // Update transfer request status
        transferRequest.status = 'accepted';
        await transferRequest.save();

        res.json({
          message: 'Product ownership transfer accepted and completed successfully',
          product,
        });
      }
    } else {
      // Reject transfer request
      transferRequest.status = 'rejected';
      await transferRequest.save();

      // Log in product timeline
      product.timeline.push({
        event: transferRequest.type === 'share' ? 'Shared' : 'Ownership Transferred',
        date: new Date(),
        description: transferRequest.type === 'share'
          ? `Share request to ${user.name} was declined.`
          : `Transfer request to ${user.name} was declined.`,
      });
      await product.save();

      res.json({ message: transferRequest.type === 'share' ? 'Product sharing declined' : 'Product ownership transfer declined' });
    }
  } catch (error) {
    console.error('Respond transfer error:', error);
    res.status(500).json({ message: 'Server error responding to transfer request' });
  }
});

module.exports = router;
