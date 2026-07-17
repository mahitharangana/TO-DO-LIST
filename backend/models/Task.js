const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: ["Personal", "Work", "Study", "Health", "Shopping"],
    default: "Personal",
  },
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium",
  },
  dueDate: {
    type: Date,
    default: null,
  },
  reminderAt: {
    type: Date,
    default: null,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Task", taskSchema);
