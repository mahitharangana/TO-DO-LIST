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
  reminderAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Task", taskSchema);
