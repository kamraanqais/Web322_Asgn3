const express = require("express");
const router = express.Router();

let sequelize = null;
let Task = null;

// Initialize Sequelize ONCE (serverless-safe)
async function initDB() {
  if (sequelize) return sequelize;

  const { Sequelize } = require("sequelize");
  const pg = require("pg");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL missing");
    throw new Error("DATABASE_URL is NULL");
  }

  sequelize = new Sequelize(url, {
    dialect: "postgres",
    dialectModule: pg,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });

  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected.");
  } catch (err) {
    console.error("PostgreSQL FAILED:", err);
    throw err;
  }

  // Load model
  Task = require("../models/Task")(sequelize);

  // Sync (safe in serverless)
  await sequelize.sync();

  return sequelize;
}

// Safe date helper
const safeDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d.toISOString().split("T")[0];
};

// ================= ROUTES ===================

// GET /tasks
router.get("/", async (req, res) => {
  try {
    await initDB();

    const tasks = await Task.findAll({
      where: { userId: req.session.user.id },
      order: [["createdAt", "DESC"]],
    });

    res.render("tasks", { tasks });
  } catch (err) {
    console.error("Tasks error:", err);
    res.status(500).render("error", {
      title: "Error",
      message: "Failed to load tasks",
    });
  }
});

// Add Task
router.get("/add", (req, res) => {
  res.render("add-task", { title: "Add Task" });
});

router.post("/add", async (req, res) => {
  try {
    await initDB();

    const { title, description, dueDate } = req.body;

    if (!title?.trim())
      return res.redirect("/tasks?error=Title required");

    await Task.create({
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: safeDate(dueDate),
      status: "pending",
      userId: req.session.user.id,
    });

    res.redirect("/tasks?success=Task added");
  } catch (err) {
    console.error("Add task error:", err);
    res.redirect("/tasks?error=Failed to add task");
  }
});

// Edit Task
router.get("/edit/:id", async (req, res) => {
  try {
    await initDB();

    const task = await Task.findOne({
      where: { id: req.params.id, userId: req.session.user.id },
    });

    if (!task) return res.redirect("/tasks?error=Not found");

    res.render("edit-task", { task, title: "Edit Task" });
  } catch (err) {
    console.error("Edit task load error:", err);
    res.redirect("/tasks?error=Failed to load task");
  }
});

router.post("/edit/:id", async (req, res) => {
  try {
    await initDB();

    const { title, description, dueDate } = req.body;

    if (!title?.trim())
      return res.redirect(`/tasks/edit/${req.params.id}?error=Title required`);

    await Task.update(
      {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: safeDate(dueDate),
      },
      { where: { id: req.params.id, userId: req.session.user.id } }
    );

    res.redirect("/tasks?success=Task updated");
  } catch (err) {
    console.error("Edit update error:", err);
    res.redirect("/tasks?error=Failed to update");
  }
});

// Delete Task
router.post("/delete/:id", async (req, res) => {
  try {
    await initDB();

    await Task.destroy({
      where: { id: req.params.id, userId: req.session.user.id },
    });

    res.redirect("/tasks?success=Task deleted");
  } catch (err) {
    console.error("Delete error:", err);
    res.redirect("/tasks?error=Failed to delete");
  }
});

// Toggle status
router.post("/status/:id", async (req, res) => {
  try {
    await initDB();

    const task = await Task.findOne({
      where: { id: req.params.id, userId: req.session.user.id },
    });

    if (task) {
      await task.update({
        status: task.status === "completed" ? "pending" : "completed",
      });
    }

    res.redirect("/tasks");
  } catch (err) {
    console.error("Status error:", err);
    res.redirect("/tasks?error=Failed to update status");
  }
});

module.exports = router;
