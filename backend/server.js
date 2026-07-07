require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const path     = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT     = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) { console.error("Missing MONGO_URI in .env"); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error("MongoDB error:", err));

const Task = require("./models/Task");

// GET all tasks — sorted by order, then createdAt
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ order: 1, createdAt: -1 });
    res.json(tasks);
  } catch (e) { res.status(500).json({ message: "Failed to fetch tasks", e }); }
});

// POST add task
app.post("/add", async (req, res) => {
  try {
    // Assign the new task the lowest order (top of list)
    const minOrder = await Task.findOne().sort({ order: 1 }).select("order");
    const order = minOrder ? minOrder.order - 1 : 0;
    const task = new Task({ ...req.body, order });
    await task.save();
    res.status(201).json(task);
  } catch (e) { res.status(500).json({ message: "Failed to add task", e }); }
});

// PATCH toggle complete
app.patch("/tasks/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Not found" });
    task.completed = !task.completed;
    await task.save();
    res.json(task);
  } catch (e) { res.status(500).json({ message: "Failed to toggle task", e }); }
});

// PATCH update task (text, category, priority, dueDate, reminderAt)
app.patch("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: "Not found" });
    res.json(task);
  } catch (e) { res.status(500).json({ message: "Failed to update task", e }); }
});

// DELETE task
app.delete("/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Failed to delete task", e }); }
});

// DELETE all completed tasks
app.delete("/tasks/completed/all", async (req, res) => {
  try {
    const result = await Task.deleteMany({ completed: true });
    res.json({ message: "Cleared", deleted: result.deletedCount });
  } catch (e) { res.status(500).json({ message: "Failed to clear completed", e }); }
});

// PATCH reorder tasks — body: [{ id, order }, ...]
app.patch("/tasks/reorder/bulk", async (req, res) => {
  try {
    const updates = req.body; // [{ id, order }]
    await Promise.all(
      updates.map(({ id, order }) =>
        Task.findByIdAndUpdate(id, { $set: { order } })
      )
    );
    res.json({ message: "Reordered" });
  } catch (e) { res.status(500).json({ message: "Failed to reorder tasks", e }); }
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

