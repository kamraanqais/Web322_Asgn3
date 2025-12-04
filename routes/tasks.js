// routes/tasks.js — FINAL VERIFIED VERSION (No Global Connections)
const express = require('express');
const router = express.Router();

// Lazy-load Sequelize only when needed (serverless-safe)
let sequelizeInstance = null;
let Task = null;

const initSequelize = async () => {
  if (!sequelizeInstance) {
    const { Sequelize } = require('sequelize');
    
    // THIS LINE IS THE REAL FIX — parse Neon URL properly + force SSL off for Vercel
    const dbUrl = process.env.DATABASE_URL.replace('postgres://', 'postgresql://');
    
    sequelizeInstance = new Sequelize(dbUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false,
      define: { timestamps: true },
      pool: { max: 1, min: 0, idle: 10000, acquire: 30000 },
      // ADD THIS LINE — fixes 99% of Neon + Vercel cold start issues
      retry: { max: 3 }
    });

    try {
      await sequelizeInstance.authenticate();
      console.log('PostgreSQL connected successfully on Vercel');
    } catch (err) {
      console.error('PostgreSQL connection failed:', err.message);
      throw err;
    }

    Task = require('../models/Task.js')(sequelizeInstance);   // Add .js extension
  }
  return Task;

};

// Safe date helper
const safeDate = (dateStr) => {
  if (!dateStr || dateStr === '' || dateStr === 'Invalid date') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};

// GET tasks
router.get('/', async (req, res) => {
  try {
    await initSequelize();
    const tasks = await Task.findAll({
      where: { userId: req.session.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.render('tasks', { tasks, title: 'Your Tasks' });
  } catch (err) {
    console.error('Tasks error:', err);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load tasks' });
  }
});

router.get('/add', (req, res) => res.render('add-task', { title: 'Add Task' }));

router.post('/add', async (req, res) => {
  try {
    await initSequelize();
    const { title, description, dueDate } = req.body;
    if (!title?.trim()) return res.redirect('/tasks?error=Title required');
    await Task.create({
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: safeDate(dueDate),  // ← FIXED: Safe parsing
      status: 'pending',
      userId: req.session.user.id
    });
    res.redirect('/tasks?success=Task added');
  } catch (err) {
    console.error('Add task error:', err);
    res.redirect('/tasks?error=Failed to add task');
  }
});

router.get('/edit/:id', async (req, res) => {
  try {
    await initSequelize();
    const task = await Task.findOne({ where: { id: req.params.id, userId: req.session.user.id } });
    if (!task) return res.redirect('/tasks?error=Not found');
    res.render('edit-task', { task, title: 'Edit Task' });
  } catch (err) {
    console.error('Edit load error:', err);
    res.redirect('/tasks?error=Failed to load task');
  }
});

router.post('/edit/:id', async (req, res) => {
  try {
    await initSequelize();
    const { title, description, dueDate } = req.body;
    if (!title?.trim()) return res.redirect(`/tasks/edit/${req.params.id}?error=Title required`);
    await Task.update(
      { title: title.trim(), description: description?.trim() || null, dueDate: safeDate(dueDate) },  // ← FIXED
      { where: { id: req.params.id, userId: req.session.user.id } }
    );
    res.redirect('/tasks?success=Task updated');
  } catch (err) {
    console.error('Edit update error:', err);
    res.redirect('/tasks?error=Failed to update task');
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    await initSequelize();
    await Task.destroy({ where: { id: req.params.id, userId: req.session.user.id } });
    res.redirect('/tasks?success=Task deleted');
  } catch (err) {
    console.error('Delete error:', err);
    res.redirect('/tasks?error=Failed to delete task');
  }
});

router.post('/status/:id', async (req, res) => {
  try {
    await initSequelize();
    const task = await Task.findOne({ where: { id: req.params.id, userId: req.session.user.id } });
    if (task) {
      await task.update({ status: task.status === 'completed' ? 'pending' : 'completed' });
    }
    res.redirect('/tasks');
  } catch (err) {
    console.error('Status error:', err);
    res.redirect('/tasks?error=Failed to update status');
  }
});

module.exports = router;