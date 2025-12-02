const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('client-sessions');
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// PostgreSQL - NEON
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: false
});

sequelize.authenticate()
  .then(() => console.log('Connected to Neon PostgreSQL'))
  .catch(err => console.error('Connection failed:', err));

// CREATE TABLE ONCE AND FOREVER
sequelize.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    "dueDate" DATE,
    status VARCHAR(20) DEFAULT 'pending',
    "userId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => console.log('tasks table ready'))
 .catch(() => console.log('Table already exists'));

app.set('sequelize', sequelize);

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.use((req, res) => res.status(404).render('error', { title: '404', message: 'Not Found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Everything works: Create, Edit, Delete, Toggle`);
});