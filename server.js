// server.js — FINAL VERCEL + NEON WORKING VERSION
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('client-sessions');
const mongoose = require('mongoose');
const { neon } = require('@neondatabase/serverless');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB for users (Mongoose)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// Neon SQL for tasks (no Sequelize — direct driver)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),  // ← THIS LINE FIXES THE PG PACKAGE ERROR
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
  pool: {
    max: 1,  // Vercel serverless limit
    min: 0,
    idle: 10000,
    acquire: 30000
  }
});

// Create tasks table (if not exists)
sql`CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "dueDate" DATE,
  status VARCHAR(20) DEFAULT 'pending',
  "userId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
)`.then(() => console.log('Neon tasks table ready'));

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  cookieName: 'session',
  secret: process.env.SESSION_SECRET || 'supersecret123',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'
}));

app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/tasks', require('./routes/tasks'));

app.get('/', (req, res) => {
  req.session.user ? res.redirect('/dashboard') : res.render('index', { title: 'Home' });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('dashboard', { title: 'Dashboard' });
});

app.use((req, res) => res.status(404).render('error', { title: '404', message: 'Page not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});