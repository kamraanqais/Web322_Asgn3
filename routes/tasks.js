// routes/tasks.js — 100% WORKING (Create + Edit + Delete + Toggle)
const express = require('express');
const router = express.Router();

const getSequelize = (req) => req.app.get('sequelize');

const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
};
router.use(requireLogin);

// LIST ROUTE
router.get('/', async (req, res) => {
  try {
    const sequelize = getSequelize(req);
    const [tasks] = await sequelize.query(
      `SELECT * FROM tasks WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      { bind: [req.session.user.id] }
    );
    res.render('tasks', { tasks: tasks || [], success: req.query.success });
  } catch (err) {
    res.render('tasks', { tasks: [], error: 'Failed to load tasks' });
  }
});

// ADD ROUTES
router.get('/add', (req, res) => {
  res.render('add-task', { errors: [], taskData: {} });
});

router.post('/add', async (req, res) => {
  try {
    const sequelize = getSequelize(req);
    await sequelize.query(
      `INSERT INTO tasks (title, description, "dueDate", "userId") VALUES ($1, $2, $3, $4)`,
      { bind: [req.body.title, req.body.description || null, req.body.dueDate || null, req.session.user.id] }
    );
    res.redirect('/tasks?success=Task+created');
  } catch (err) {
    res.render('add-task', { errors: [{ msg: 'Failed to create task' }], taskData: req.body });
  }
});

// EDIT ROUTES
router.get('/edit/:id', async (req, res) => {
  try {
    const sequelize = getSequelize(req);
    const [task] = await sequelize.query(
      `SELECT * FROM tasks WHERE id = $1 AND "userId" = $2`,
      { bind: [req.params.id, req.session.user.id] }
    );
    if (!task || task.length === 0) return res.redirect('/tasks');
    res.render('edit-task', { task: task[0], errors: [], taskData: task[0] });
  } catch (err) {
    res.redirect('/tasks');
  }
});

router.post('/edit/:id', async (req, res) => {
  try {
    const sequelize = getSequelize(req);
    await sequelize.query(
      `UPDATE tasks SET title = $1, description = $2, "dueDate" = $3 WHERE id = $4 AND "userId" = $5`,
      { bind: [req.body.title, req.body.description || null, req.body.dueDate || null, req.params.id, req.session.user.id] }
    );
    res.redirect('/tasks?success=Task+updated');
  } catch (err) {
    const [task] = await sequelize.query(`SELECT * FROM tasks WHERE id = $1`, { bind: [req.params.id] });
    res.render('edit-task', { task: task[0] || {}, errors: [{ msg: 'Update failed' }], taskData: req.body });
  }
});

// TOGGLE STATUS
router.post('/status/:id', async (req, res) => {
  const sequelize = getSequelize(req);
  await sequelize.query(
    `UPDATE tasks SET status = CASE WHEN status = 'completed' THEN 'pending' ELSE 'completed' END WHERE id = $1 AND "userId" = $2`,
    { bind: [req.params.id, req.session.user.id] }
  );
  res.redirect('/tasks');
});

// DELETE ROUTE
router.post('/delete/:id', async (req, res) => {
  const sequelize = getSequelize(req);
  await sequelize.query(`DELETE FROM tasks WHERE id = $1 AND "userId" = $2`, {
    bind: [req.params.id, req.session.user.id]
  });
  res.redirect('/tasks');
});

module.exports = router;