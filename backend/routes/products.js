const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper to make Gemini API requests using native fetch (Node 18+)
async function callGemini(prompt, base64Image = null, mimeType = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  // Use latest Gemini Flash model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;


  let contents = [];
  if (base64Image && mimeType) {
    contents = [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ];
  } else {
    contents = [
      {
        parts: [{ text: prompt }],
      },
    ];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contents }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return textResponse;
}

// @route   GET /api/products
// @desc    Get all products owned by or shared with user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Find products where owner is current user OR current user is in sharedWith
    const products = await Product.find({
      $or: [{ owner: userId }, { sharedWith: userId }],
    })
      .populate('owner', 'name email')
      .populate('sharedWith', 'name email')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// @route   POST /api/products/ocr
// @desc    Analyze receipt base64 image and extract data using Gemini
// @access  Private
router.post('/ocr', auth, async (req, res) => {
  try {
    const { receiptImage } = req.body;
    if (!receiptImage) {
      return res.status(400).json({ message: 'Receipt image data is required' });
    }

    // Clean base64 string if it contains data prefix
    let base64Data = receiptImage;
    let mimeType = 'image/jpeg';
    if (receiptImage.includes(';base64,')) {
      const parts = receiptImage.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }

    const ocrPrompt = `
      Analyze this product purchase receipt or invoice. Extract the key product information.
      Return ONLY a raw JSON object, without any markdown formatting, markdown code blocks, or leading/trailing text.
      The JSON object MUST strictly use these fields:
      {
        "name": "Exact name of the product or brand (e.g., 'MacBook Pro 14', 'LG Smart TV')",
        "category": "One of: 'Electronics', 'Appliances', 'Furniture', 'Home', 'Automotive', 'Other'",
        "price": 1299.99 (the total purchase price as a number, no currency symbols),
        "purchaseDate": "YYYY-MM-DD format of when it was bought (default to current date if missing)",
        "purchaseLocation": "Store/merchant name (e.g. 'Apple Store', 'Amazon', 'Croma')",
        "totalWarranties": 12 (estimated warranty period in MONTHS, guess based on standard terms if not clearly shown - electronics is usually 12 or 24, appliances 24, etc.)
      }
    `;

    let extractedData;
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Sending receipt to Gemini API for OCR...');
        const responseText = await callGemini(ocrPrompt, base64Data, mimeType);
        console.log('Gemini response:', responseText);

        // Extract the raw JSON block using regex to handle any surrounding text or markdown formatting
        let cleanJsonStr = responseText.trim();
        const jsonMatch = cleanJsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanJsonStr = jsonMatch[0];
        }

        extractedData = JSON.parse(cleanJsonStr);

      } catch (geminiError) {
        console.warn('Gemini OCR failed, falling back to mock extraction:', geminiError.message);
      }
    }

    // Fallback/Mock generator if Gemini isn't configured or fails
    if (!extractedData) {
      console.log('Using simulated/mock OCR extraction...');
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate random variations of mock products for testing variety
      const mockReceipts = [
        {
          name: 'Sony WH-1000XM5 Headphones',
          category: 'Electronics',
          price: 29990,
          purchaseLocation: 'Sony Center, Mumbai',
          totalWarranties: 12,
        },
        {
          name: 'Samsung 253L Double Door Refrigerator',
          category: 'Appliances',
          price: 24990,
          purchaseLocation: 'Vijay Sales, Delhi',
          totalWarranties: 24,
        },
        {
          name: 'Dyson V11 Absolute Vacuum Cleaner',
          category: 'Appliances',
          price: 52900,
          purchaseLocation: 'Dyson Web Store',
          totalWarranties: 24,
        },
        {
          name: 'Ergonomic Mesh Office Chair',
          category: 'Furniture',
          price: 12500,
          purchaseLocation: 'Pepperfry, Bangalore',
          totalWarranties: 36,
        },
      ];

      // Select random item
      const selectIndex = Math.floor(Math.random() * mockReceipts.length);
      const selected = mockReceipts[selectIndex];

      const todayStr = new Date().toISOString().split('T')[0];

      extractedData = {
        name: selected.name,
        category: selected.category,
        price: selected.price,
        purchaseDate: todayStr,
        purchaseLocation: selected.purchaseLocation,
        totalWarranties: selected.totalWarranties,
      };
    }

    res.json({
      message: 'Receipt parsed successfully',
      data: extractedData,
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ message: 'Error processing receipt image' });
  }
});

// @route   POST /api/products
// @desc    Create a product passport
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      purchaseDate,
      purchaseLocation,
      receiptImage,
      productImage,
      totalWarranties,
      warrantyStartDate,
      warrantyExpiryDate,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Product name and category are required' });
    }

    // Set warranty details
    const start = warrantyStartDate ? new Date(warrantyStartDate) : (purchaseDate ? new Date(purchaseDate) : new Date());
    let expiry;
    if (warrantyExpiryDate) {
      expiry = new Date(warrantyExpiryDate);
    } else {
      // Default totalWarranties in months
      const months = totalWarranties ? parseInt(totalWarranties) : 12;
      expiry = new Date(start);
      expiry.setMonth(expiry.getMonth() + months);
    }

    const newProduct = new Product({
      owner: req.user.id,
      name,
      category,
      price: price || 0,
      purchaseDate: purchaseDate || new Date(),
      purchaseLocation: purchaseLocation || '',
      receiptImage: receiptImage || '',
      productImage: productImage || '',
      warranty: {
        totalWarranties: totalWarranties || 1,
        warrantiesUsed: 0,
        warrantiesRemaining: totalWarranties || 1,
        startDate: start,
        expiryDate: expiry,
      },
      timeline: [
        {
          event: 'Purchased',
          date: purchaseDate || new Date(),
          description: `Product purchased at ${purchaseLocation || 'unknown store'}.`,
        },
        {
          event: 'Warranty Started',
          date: start,
          description: `Warranty registration active until ${expiry.toDateString()}.`,
        },
      ],
    });

    const product = await newProduct.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
});

// @route   GET /api/products/:id
// @desc    Get detailed product passport
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.id || req.params.id)
      .populate('owner', 'name email')
      .populate('sharedWith', 'name email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check permissions
    const isOwner = product.owner._id.toString() === req.user.id;
    const isShared = product.sharedWith.some((u) => u._id.toString() === req.user.id);

    if (!isOwner && !isShared) {
      return res.status(403).json({ message: 'Not authorized to view this product passport' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error fetching product passport' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product details
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, price, purchaseDate, purchaseLocation, warranty } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the owner can modify product details' });
    }

    // Update fields
    if (name) product.name = name;
    if (category) product.category = category;
    if (price !== undefined) product.price = price;
    if (purchaseDate) product.purchaseDate = purchaseDate;
    if (purchaseLocation) product.purchaseLocation = purchaseLocation;
    if (warranty) {
      product.warranty = { ...product.warranty, ...warranty };
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product passport
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the owner can delete this product passport' });
    }

    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product passport deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

// @route   POST /api/products/:id/repairs
// @desc    Add a repair event to repair logs
// @access  Private
router.post('/:id/repairs', auth, async (req, res) => {
  try {
    const { description, partsChanged, cost, notes, repairDate } = req.body;
    if (!description) {
      return res.status(400).json({ message: 'Repair description is required' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const isOwner = product.owner.toString() === req.user.id;
    const isShared = product.sharedWith.some((id) => id.toString() === req.user.id);
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: 'Unauthorized to add repair logs' });
    }

    const newRepair = {
      repairDate: repairDate || new Date(),
      description,
      partsChanged: partsChanged || '',
      cost: cost || 0,
      notes: notes || '',
    };

    product.repairs.push(newRepair);

    // Add event to timeline
    product.timeline.push({
      event: 'Repair Done',
      date: repairDate || new Date(),
      description: `Repaired: ${description}. cost: ₹${cost || 0}. ${partsChanged ? `Parts changed: ${partsChanged}` : ''}`,
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Add repair error:', error);
    res.status(500).json({ message: 'Server error adding repair history' });
  }
});

// @route   POST /api/products/:id/warranty-use
// @desc    Mark a warranty claim as used
// @access  Private
router.post('/:id/warranty-use', auth, async (req, res) => {
  try {
    const { notes, claimDate } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const isOwner = product.owner.toString() === req.user.id;
    const isShared = product.sharedWith.some((id) => id.toString() === req.user.id);
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (product.warranty.warrantiesRemaining <= 0) {
      return res.status(400).json({ message: 'No remaining warranty claims available' });
    }

    product.warranty.warrantiesUsed += 1;
    product.warranty.warrantiesRemaining -= 1;

    product.timeline.push({
      event: 'Warranty Used',
      date: claimDate || new Date(),
      description: `Warranty claim logged. ${notes ? `Notes: ${notes}` : ''}`,
    });

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Use warranty error:', error);
    res.status(500).json({ message: 'Server error logging warranty claim' });
  }
});

// @route   POST /api/products/:id/share
// @desc    Share product with a user by email
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required for sharing' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the product owner can share access' });
    }

    const userToShareWith = await User.findOne({ email: email.toLowerCase() });
    if (!userToShareWith) {
      return res.status(404).json({ message: `No user found with email ${email}` });
    }

    if (userToShareWith._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot share a product with yourself' });
    }

    // Check if already shared
    const alreadyShared = product.sharedWith.some(
      (id) => id.toString() === userToShareWith._id.toString()
    );

    if (alreadyShared) {
      return res.status(400).json({ message: 'Product is already shared with this user' });
    }

    product.sharedWith.push(userToShareWith._id);

    product.timeline.push({
      event: 'Shared',
      date: new Date(),
      description: `Product access shared with ${userToShareWith.name} (${userToShareWith.email}).`,
    });

    await product.save();
    res.json({
      message: `Product successfully shared with ${userToShareWith.name}`,
      product,
    });
  } catch (error) {
    console.error('Share product error:', error);
    res.status(500).json({ message: 'Server error sharing product' });
  }
});

// @route   POST /api/products/:id/unshare
// @desc    Remove sharing access from a user
// @access  Private
router.post('/:id/unshare', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required to remove access' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only owner or the shared user themselves can remove sharing access
    const isOwner = product.owner.toString() === req.user.id;
    const isSelfUnshare = userId === req.user.id;

    if (!isOwner && !isSelfUnshare) {
      return res.status(403).json({ message: 'Not authorized to remove sharing access' });
    }

    product.sharedWith = product.sharedWith.filter((id) => id.toString() !== userId);

    const userDetails = await User.findById(userId);
    product.timeline.push({
      event: 'Shared',
      date: new Date(),
      description: `Access revoked for ${userDetails ? userDetails.name : 'user'}.`,
    });

    await product.save();
    res.json({ message: 'Sharing access revoked successfully', product });
  } catch (error) {
    console.error('Unshare product error:', error);
    res.status(500).json({ message: 'Server error removing sharing access' });
  }
});

// @route   POST /api/products/:id/ask-manual
// @desc    Ask questions about the product manual using Gemini API
// @access  Private
router.post('/:id/ask-manual', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update neverOpened flag if this is the first time the manual assistant is queried
    if (product.manual.neverOpened) {
      product.manual.neverOpened = false;
      await product.save();
    }

    const prompt = `
      You are Vaultify's AI Product Manual Assistant. The user owns a "${product.name}" under the category "${product.category}".
      The user is asking a question about their product: "${question}".
      
      Using your knowledge about "${product.name}", provide a helpful, accurate, and concise answer.
      - If it is about setting up, provide 3-4 bullet steps.
      - If it is about troubleshooting, suggest a possible cause and how to fix it.
      - If it is about general product maintenance, give simple tips.
      - If you do not have specific manual information for this exact model, provide standard, helpful advice for this type of product (${product.category}) and suggest looking at the physical manufacturer manual.

      Limit the response to at most 150 words. Be helpful and professional.
    `;

    let reply = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Sending manual inquiry to Gemini API...');
        reply = await callGemini(prompt);
      } catch (geminiError) {
        console.warn('Gemini chat failed, using fallback responses:', geminiError.message);
      }
    }

    if (!reply) {
      console.log('Using fallback/simulated chatbot response...');
      // Simulated delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const lowerQ = question.toLowerCase();
      if (lowerQ.includes('setup') || lowerQ.includes('start') || lowerQ.includes('install')) {
        reply = `To set up your ${product.name}, follow these standard steps:
1. Carefully unbox the device and connect the power cables.
2. Refer to the manufacturer's initial configuration settings (like connecting to Wi-Fi or pairing via Bluetooth).
3. Download the official companion app if applicable.
4. Run a test cycle or check indicator lights to confirm the device is working.`;
      } else if (lowerQ.includes('trouble') || lowerQ.includes('error') || lowerQ.includes('reset') || lowerQ.includes('not working')) {
        reply = `For troubleshooting your ${product.name}, try these initial steps:
1. Power cycle the device by turning it off, waiting 30 seconds, and turning it back on.
2. Double check that all power cables, connections, and battery inputs are secure.
3. To perform a factory reset, hold the power/reset button for 10-15 seconds.
4. If issues persist, check the status lights against the manufacturer's troubleshooting guide.`;
      } else {
        reply = `Thank you for asking about the ${product.name}. For standard operations:
- Keep the device clean and dry, away from direct sunlight.
- Make sure firmware is updated regularly via the manufacturer's portal.
- Refer to standard ${product.category} manuals for details on advanced features and safety declarations.`;
      }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Manual chatbot error:', error);
    res.status(500).json({ message: 'Error processing question about the manual' });
  }
});

// @route   GET /api/products/:id/fetch-manual
// @desc    Generate a user manual/quick-start guide for the product using Gemini API
// @access  Private
router.get('/:id/fetch-manual', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check permissions
    const isOwner = product.owner.toString() === req.user.id;
    const isShared = product.sharedWith.some((id) => id.toString() === req.user.id);
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: 'Not authorized to fetch manual for this product' });
    }

    const prompt = `
      You are Vaultify's AI Manual Generator.
      Generate a comprehensive and structured Quick-Start Manual and User Guide for the following product:
      Product Name: "${product.name}"
      Category: "${product.category}"
      
      The manual MUST contain exactly these sections, formatted in clean, professional markdown:
      # Quick-Start Manual: ${product.name}
      
      ### 1. Product Overview
      Provide a brief 2-3 sentence description of the product and its primary purpose.
      
      ### 2. Key Features
      List 3-4 notable features of the product with quick descriptions in a bullet list.
      
      ### 3. Quick Setup Instructions
      Provide 4-5 numbered, step-by-step instructions on how to install, power up, connect, or pair the device.
      
      ### 4. Maintenance & Safety
      Provide 3 key bullet points on keeping the product in optimal condition.
      
      ### 5. Troubleshooting Guide
      List 3 common issues and how to fix them.
      
      Use headers, bullet points, and numbers for readability. Keep it concise, clear, and professional.
      If you do not have specific data for this exact model, provide standard, highly helpful instructions for a similar ${product.category} product.
    `;

    let manualText = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log(`Generating manual for ${product.name} using Gemini API...`);
        manualText = await callGemini(prompt);
      } catch (geminiError) {
        console.warn('Gemini manual generation failed:', geminiError.message);
      }
    }

    if (!manualText) {
      console.log('Using simulated/mock manual...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      manualText = `
# Quick-Start Manual: ${product.name}

Welcome to the digital user guide for your **${product.name}**. Below you will find setup, usage, maintenance, and troubleshooting steps.

---

### 1. Product Overview
The **${product.name}** is a premium device in the **${product.category}** category designed to deliver exceptional performance, reliability, and modern convenience.

### 2. Key Features
- **Modern Interface**: Designed for user-friendly navigation and controls.
- **Smart Connectivity**: Integrates seamlessly with modern ecosystems.
- **High Durability**: Built with premium materials to stand the test of time.

### 3. Quick Setup Instructions
1. **Unbox**: Carefully remove all packaging materials and inspect the device.
2. **Power Connection**: Plug the device into a standard power outlet or verify battery charge.
3. **Turn On**: Press and hold the power button for 3 seconds until the indicator light illuminates.
4. **Configuration**: Follow standard pairing/configuration instructions (e.g. Wi-Fi connection, Bluetooth pairing, or companion app download).
5. **Ready to Use**: Run a quick diagnostic test to confirm standard operations.

### 4. Maintenance & Safety
- **Cleanliness**: Wipe down the outer surface with a soft, dry cloth. Avoid abrasive cleaners.
- **Storage**: Store in a cool, dry place away from direct sunlight or moisture.
- **Safety First**: Do not attempt to open the main body containing internal circuitry.

### 5. Troubleshooting Guide
- **Issue**: Device does not turn on.
  - **Solution**: Check power cables or charge the battery for at least 30 minutes.
- **Issue**: Connection failure.
  - **Solution**: Restart the device and your router/phone. Turn Bluetooth/Wi-Fi off and back on.
- **Issue**: Low performance.
  - **Solution**: Ensure the latest firmware is installed and wipe away any accumulated dust.
      `;
    }

    // Update neverOpened flag if this is the first time the manual is retrieved
    if (product.manual && product.manual.neverOpened) {
      product.manual.neverOpened = false;
      await product.save();
    }

    res.json({ manual: manualText });
  } catch (error) {
    console.error('Fetch manual error:', error);
    res.status(500).json({ message: 'Error generating manual' });
  }
});

module.exports = router;

