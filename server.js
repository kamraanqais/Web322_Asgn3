/********************************************************************************
* WEB322 – Assignment 03
* Name: Kamraan Qais          Student ID: YOUR_ID          Date: December 3, 2025
********************************************************************************/

require('dotenv').config();
const express = require('express');
const path = require('path');
const sessions = require('client-sessions');
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { requireLogin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

require('./models/user');

// PostgreSQL + Task Model
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

sequelize.authenticate().then(() => console.log('PostgreSQL connected'));

const Task = require('./models/task')(sequelize);
app.set('TaskModel', Task); // Share model with all routes

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

// Routes
app.use('/', authRoutes);
app.use('/tasks', requireLogin, taskRoutes);

app.get('/', (req, res) => {
  req.session.user ? res.redirect('/dashboard') : res.redirect('/login');
});

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});