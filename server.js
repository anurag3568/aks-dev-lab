const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Schemas
const VideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    email: String,
    phone: String
});

const Video = mongoose.model('Video', VideoSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// Connect to MongoDB Atlas using environment variables
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: 'Error connecting to MongoDB backend storage.' });
    }
});

app.post('/api/videos', async (req, res) => {
    try {
        const { title, url } = req.body;
        const newVideo = new Video({ title, url });
        await newVideo.save();
        res.json({ success: true, video: newVideo });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save video to database.' });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne({ key: 'contact_info' });
        res.json(settings || { email: 'support@aksdevlab.com', phone: '+91 98765 43210' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { email, phone } = req.body;
        const settings = await Settings.findOneAndUpdate(
            { key: 'contact_info' },
            { email, phone },
            { upsert: true, new: true }
        );
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
