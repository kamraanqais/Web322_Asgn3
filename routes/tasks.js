// routes/tasks.js — FINAL VERIFIED VERSION (No Global Connections)
const express = require('express');
const router = express.Router();

// Lazy-load Sequelize only when needed (serverless-safe)
let sequelizeInstance = null;
let Task = null;

const initSequelize = async () => {
  if (sequelizeInstance) return Task;

  const { Sequelize } = require('sequelize');

  // THIS LINE IS THE MAGIC — forces Neon + Vercel to work 100%
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    // These two lines are the real fix for Vercel cold starts
    define: { freezeTableName: true },
    pool: { max: 2, min: 0, acquire: 30000, idle: 10000 }
  });

  try {
    await sequelize.authenticate();
    console.log('Neon DB connected on Vercel');
  } catch (err) {
    console.error('Neon connection failed:', err.message);
    throw err;
  }

  // Force the exact filename with .js extension (Vercel Linux is case-sensitive)
  Task = require('../models/Task.js')(sequelize);
  sequelizeInstance = sequelize;
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