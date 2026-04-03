const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Allow all origins for development


// Import Models
const User = require('./models/User');
const NavData = require('./models/NavData');

dotenv.config();
const app = express();
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas");
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error Details:");
    console.error("Error Code:", err.code);
    console.error("Hostname:", err.hostname);
    console.error("Full Message:", err.message);
  });

// --- ROUTES ---

// 1. Sign Up
app.post('/api/auth/register', async (req, res) => {
  const { email, password, role, pairCode } = req.body; // Use pairCode here
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Ensure 'pairCode' matches the name in your Model
    const user = await User.create({ email, password: hashedPassword, role, pairCode });
    
    // If pairCode doesn't exist in NavData yet, create it
    const existingNav = await NavData.findOne({ pairCode });
    if (!existingNav) {
      await NavData.create({ pairCode });
    }
    
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id, pairCode: user.pairCode }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, pairCode: user.pairCode });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// 3. Add Contact/Friend
app.post('/api/data/add-person', async (req, res) => {
  const { pairCode, type, name, number } = req.body; // type is 'emergencyContacts' or 'friends'
  try {
    const update = {};
    update[type] = { name, number };
    await NavData.findOneAndUpdate({ pairCode }, { $push: update });
    res.json({ message: "Person added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update GPS (Used by Raspberry Pi)
app.post('/api/data/gps', async (req, res) => {
  const { pairCode, lat, lng } = req.body;
  try {
    await NavData.findOneAndUpdate(
      { pairCode }, 
      { gps: { lat, lng, lastUpdated: Date.now() } }
    );
    res.json({ status: "GPS Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get All Data (Used by App to refresh Map and Lists)
app.get('/api/data/:pairCode', async (req, res) => {
  const data = await NavData.findOne({ pairCode: req.params.pairCode });
  res.json(data);
});

// Add Emergency Contact
app.post('/api/data/add-emergency', async (req, res) => {
  const { pairCode, name, number } = req.body;
  try {
    await NavData.findOneAndUpdate(
      { pairCode },
      { $push: { emergencyContacts: { name, number } } }
    );
    res.json({ message: "Emergency Contact Added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Friend
app.post('/api/data/add-friend', async (req, res) => {
  const { pairCode, name, number } = req.body;
  try {
    await NavData.findOneAndUpdate(
      { pairCode },
      { $push: { friends: { name, number } } }
    );
    res.json({ message: "Friend Added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));