const express = require('express');
const router = express.Router();

const fixDate = (dateStr) => {
  if (!dateStr || dateStr === '' || dateStr === 'Invalid date') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};

router.get('/', async (req, res) => {
  try {
    const Task = req.app.get('TaskModel');
    const tasks = await Task.findAll({
      where: { userId: req.session.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.render('tasks', { tasks, title: 'Your Tasks' });
  } catch (err) {
    console.error(err);
    res.render('error', { title: 'Error', message: 'Failed to load tasks' });
  }
});

router.get('/add', (req, res) => res.render('add-task', { title: 'Add Task' }));

router.post('/add', async (req, res) => {
  const Task = req.app.get('TaskModel');
  let { title, description, dueDate } = req.body;

  if (!title?.trim()) return res.redirect('/tasks?error=Title required');

  await Task.create({
    title: title.trim(),
    description: description?.trim() || null,
    dueDate: fixDate(dueDate),
    status: 'pending',
    userId: req.session.user.id
  });
  res.redirect('/tasks?success=Task added');
});

router.get('/edit/:id', async (req, res) => {
  const Task = req.app.get('TaskModel');
  const task = await Task.findOne({ where: { id: req.params.id, userId: req.session.user.id } });
  if (!task) return res.redirect('/tasks?error=Task not found');
  res.render('edit-task', { task, title: 'Edit Task' });
});

router.post('/edit/:id', async (req, res) => {
  const Task = req.app.get('TaskModel');
  let { title, description, dueDate } = req.body;

  if (!title?.trim()) return res.redirect(`/tasks/edit/${req.params.id}?error=Title required`);

  await Task.update(
    {
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: fixDate(dueDate)
    },
    { where: { id: req.params.id, userId: req.session.user.id } }
  );
  res.redirect('/tasks?success=Task updated');
});


router.post('/delete/:id', async (req, res) => {
  const Task = req.app.get('TaskModel');
  await Task.destroy({ where: { id: req.params.id, userId: req.session.user.id } });
  res.redirect('/tasks?success=Task deleted');
});

router.post('/status/:id', async (req, res) => {
  const Task = req.app.get('TaskModel');
  const task = await Task.findOne({ where: { id: req.params.id, userId: req.session.user.id } });
  if (task) {
    await task.update({ status: task.status === 'completed' ? 'pending' : 'completed' });
  }
  res.redirect('/tasks');
});

module.exports = router;