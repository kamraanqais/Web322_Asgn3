const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { title: 'Login', error: 'Invalid credentials' });
    }
    req.session.user = { id: user._id, username: user.username, email: user.email };
    res.redirect('/dashboard');
  } catch {
    res.render('login', { title: 'Login', error: 'Login failed' });
  }
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.render('register', { title: 'Register', error: 'User already exists' });
    }
    await User.create({ username, email, password });
    res.redirect('/login?success=Account created! Please login');
  } catch {
    res.render('register', { title: 'Register', error: 'Registration failed' });
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