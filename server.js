/********************************************************************************
* WEB322 – Assignment 03
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* Name: Kamraan Qais          Student ID: YOUR_STUDENT_ID          Date: December 3, 2025
********************************************************************************/

require('dotenv').config();
const express = require('express');
const path = require('path');
const sessions = require('client-sessions');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { requireLogin } = require('./middleware/auth');

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(sessions({
  cookieName: 'session',
  secret: process.env.SESSION_SECRET,
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  ephemeral: true
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.query.success || null;
  res.locals.error = req.query.error || null;
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).render('error', { title: 'Error', message: 'Server error. Please try again.' });
});

// Routes
app.use('/', authRoutes);
app.use('/tasks', requireLogin, taskRoutes);

app.get('/', (req, res) => {
  req.session.user ? res.redirect('/dashboard') : res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// Vercel serverless export (NO app.listen)
module.exports = app;