const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// MongoDB Schemas & Models
const VideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true, default: 'agency_settings' },
    email: { type: String, default: 'support@aksdevlab.in' },
    phone: { type: String, default: '+91 98765 43210' },
    adminPassword: { type: String, default: 'admin123' } // Global cloud-synced password
});

const Video = mongoose.models.Video || mongoose.model('Video', VideoSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// Video Routes
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json(videos);
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).json({ error: 'Failed to retrieve videos' });
    }
});

app.post('/api/videos', async (req, res) => {
    try {
        const { title, url } = req.body;
        if (!title || !url) {
            return res.status(400).json({ error: 'Title and URL are required' });
        }
        const newVideo = new Video({ title, url });
        await newVideo.save();
        res.status(201).json({ message: 'Video saved successfully', video: newVideo });
    } catch (err) {
        console.error('Error saving video:', err);
        res.status(500).json({ error: 'Failed to upload video to MongoDB' });
    }
});

app.put('/api/videos/:id', async (req, res) => {
    try {
        const { title, url } = req.body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (url !== undefined) updateData.url = url;

        const updated = await Video.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Video not found' });
        }
        res.json({ message: 'Video updated successfully', video: updated });
    } catch (err) {
        console.error('Error updating video:', err);
        res.status(500).json({ error: 'Failed to update video' });
    }
});

app.delete('/api/videos/:id', async (req, res) => {
    try {
        const deleted = await Video.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Video not found' });
        }
        res.json({ message: 'Video deleted successfully', id: req.params.id });
    } catch (err) {
        console.error('Error deleting video:', err);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// Agency Settings Routes
app.get('/api/settings', async (req, res) => {
    try {
        let config = await Settings.findOne({ key: 'agency_settings' });
        if (!config) {
            config = await Settings.create({ key: 'agency_settings' });
        }
        res.json(config);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Failed to retrieve agency settings' });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { email, phone } = req.body;
        const config = await Settings.findOneAndUpdate(
            { key: 'agency_settings' },
            { email, phone },
            { new: true, upsert: true }
        );
        res.json({ message: 'Settings updated successfully', settings: config });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Failed to save agency settings' });
    }
});

// Global Admin Password Update Route
app.post('/api/admin/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        let config = await Settings.findOne({ key: 'agency_settings' });

        if (!config) {
            config = await Settings.create({ key: 'agency_settings', adminPassword: 'admin123' });
        }

        const storedPassword = config.adminPassword || 'admin123';

        if (currentPassword !== storedPassword) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        config.adminPassword = newPassword;
        await config.save();

        res.json({ message: 'Admin password updated globally in MongoDB Atlas' });
    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ error: 'Failed to update global admin password' });
    }
});

// Server Initialization
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
