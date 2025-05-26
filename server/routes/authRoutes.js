import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { user: { id: req.user.id } },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Use the correct client URL based on environment
    const clientUrl = process.env.NODE_ENV === 'production'
      ? 'https://bluc-payed.vercel.app'
      : 'http://localhost:5173';

    // Add a check to ensure we're not in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode detected, using localhost URLs');
    }

    res.redirect(`${clientUrl}?token=${token}&isProfileComplete=${req.user.isProfileComplete}`);
  }
);

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    user = new User({
      email,
      password,
      fullName,
      isProfileComplete: false
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    user.lastLogin = Date.now();
    await user.save();
    
    const token = jwt.sign(
      { user: { id: user.id } },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({ 
      token,
      isProfileComplete: user.isProfileComplete 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, gender, dateOfBirth, interests } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        fullName, 
        gender, 
        dateOfBirth, 
        interests,
        isProfileComplete: true 
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;