const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Database Schemas
const VideoSchema = new mongoose.Schema({
  title: String,
  url: String,
  date: { type: Date, default: Date.now }
});
const Video = mongoose.model('Video', VideoSchema);

const ConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String
});
const Config = mongoose.model('Config', ConfigSchema);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Create Order Endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}` } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise.' });
    }
    const order = await razorpay.orders.create({
      amount: parseInt(amount, 10),
      currency,
      receipt,
      payment_capture: 1,
    });
    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// 2. Verify Payment Endpoint
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      res.status(200).json({ status: 'success', paymentId: razorpay_payment_id });
    } else {
      res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Verification failure', details: err.message });
  }
});

// 3. Videos Endpoints
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ _id: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const { title, url } = req.body;
    const newVideo = new Video({ title, url });
    await newVideo.save();
    res.json({ status: 'success', video: newVideo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save video' });
  }
});

// 4. Admin Password / Config Endpoints
app.get('/api/config/:key', async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    res.json({ value: config ? config.value : null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { key, value } = req.body;
    await Config.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});