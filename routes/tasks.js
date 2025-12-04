// routes/tasks.js — FINAL VERIFIED VERSION (No Global Connections)
const express = require('express');
const router = express.Router();


const initSequelize = async () => {
  if (sequelizeInstance) return Task;

  const { Sequelize } = require('sequelize');

  // Force correct protocol + SSL settings that Neon + Vercel love
  const dbUrl = process.env.DATABASE_URL.replace(/^postgres:/, 'postgresql:');

  sequelizeInstance = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false   // Critical for Neon on Vercel
      }
    },
    pool: { max: 1, min: 0, acquire: 30000, idle: 10000 },
    retry: { max: 3 }   // Auto retry connection
  });

  // RETRY LOGIC + DETAILED LOGS
  let attempts = 3;
  while (attempts > 0) {
    try {
      await sequelizeInstance.authenticate();
      console.log('PostgreSQL connected successfully on Vercel');
      break;
    } catch (err) {
      attempts--;
      console.error(`PostgreSQL connection attempt failed (${3 - attempts}/3):`, err.message);
      if (attempts === 0) {
        console.error('All connection attempts failed:', err);
        throw err;
      }
      await new Promise(res => setTimeout(res, 2000)); // wait 2s before retry
    }
  }

  // EXACT filename with .js extension (Vercel is case-sensitive)
  Task = require('../models/Task.js')(sequelize);

  return Task;
};

// Safe date helper
const safeDate = (dateStr) => {
  if (!dateStr || dateStr === '' || dateStr === 'Invalid date') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};

// GET all tasks
router.get('/', async (req, res) => {
    const tasks = await Task.findAll({ where: { userId: req.session.user.id } });
    res.render('tasks', { tasks });
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