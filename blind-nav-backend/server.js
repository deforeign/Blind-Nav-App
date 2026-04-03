const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import Models (Ensure these paths are correct in your project)
const User = require('./models/User');
const NavData = require('./models/NavData');

dotenv.config();
const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors({
  origin: '*', // Necessary for cross-network requests via ngrok/local IP
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Successfully connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err.message));

// --- AUTH ROUTES ---

// 1. Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, role, pairCode } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, role, pairCode });
    
    // Check if NavData for this pairCode exists, if not, initialize it
    const existingNav = await NavData.findOne({ pairCode });
    if (!existingNav) {
      await NavData.create({ 
        pairCode, 
        emergencyContacts: [], 
        friends: [],
        gps: { lat: 0, lng: 0 } 
      });
    }
    
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id, pairCode: user.pairCode }, process.env.JWT_SECRET);
      res.json({ 
        token, 
        role: user.role, 
        pairCode: user.pairCode 
      });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- DATA ROUTES (MongoDB Memory) ---

// 3. Get All Data for a PairCode (Used by HomeScreen on Load)
app.get('/api/data/:pairCode', async (req, res) => {
  try {
    const data = await NavData.findOne({ pairCode: req.params.pairCode });
    if (!data) return res.status(404).json({ error: "No data found for this pair code" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Add Emergency Contact
app.post('/api/data/add-emergency', async (req, res) => {
  const { pairCode, name, number } = req.body;
  try {
    const updated = await NavData.findOneAndUpdate(
      { pairCode },
      { $push: { emergencyContacts: { name, number } } },
      { new: true } // Returns the updated document
    );
    res.json({ message: "Emergency Contact Added", data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Add Friend
app.post('/api/data/add-friend', async (req, res) => {
  const { pairCode, name, number } = req.body;
  try {
    const updated = await NavData.findOneAndUpdate(
      { pairCode },
      { $push: { friends: { name, number } } },
      { new: true }
    );
    res.json({ message: "Friend Added", data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Update GPS (Backup route - primarily handled by Pi locally, but synced here)
app.post('/api/data/gps', async (req, res) => {
  const { pairCode, lat, lng } = req.body;
  try {
    await NavData.findOneAndUpdate(
      { pairCode }, 
      { gps: { lat, lng, lastUpdated: Date.now() } }
    );
    res.json({ status: "Cloud GPS Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 MacBook Server running on port ${PORT}`);
});