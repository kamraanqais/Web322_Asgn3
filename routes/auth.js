const express = require('express');
const router = express.Router();

// Debug logging
console.log('Auth routes loaded');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);

// Lazy-load User model with debugging
let User = null;
const initMongoose = async () => {
  if (!User) {
    console.log('Initializing MongoDB connection...');
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGO_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,  // 5 second timeout
        connectTimeoutMS: 10000
      });
      console.log('MongoDB connected successfully');
      User = require('../models/user');
      console.log('User model loaded');
    } catch (err) {
      console.error('MongoDB connection FAILED:', err.message);
      throw err;
    }
  }
  return User;
};

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  console.log('Registration attempt started');
  console.log('Request body:', req.body);
  
  try {
    const UserModel = await initMongoose();
    const { username, email, password } = req.body;
    
    console.log('Checking for existing user...');
    const existing = await UserModel.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      console.log('User already exists:', existing.email);
      return res.render('register', { title: 'Register', error: 'User already exists' });
    }
    
    console.log('Creating new user...');
    const newUser = await UserModel.create({ username, email, password });
    console.log('User created successfully:', newUser._id);
    res.redirect('/login?success=Account created! Please login');
  } catch (err) {
    console.error('Registration ERROR:', err.message);
    console.error('Full error:', err);
    res.render('register', { title: 'Register', error: `Registration failed: ${err.message}` });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  try {
    const UserModel = await initMongoose();
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { title: 'Login', error: 'Invalid credentials' });
    }
    req.session.user = { id: user._id, username: user.username, email: user.email };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { title: 'Login', error: 'Login failed' });
  }
});

router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { title: 'Dashboard' });
});

router.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/login');
});

module.exports = router;