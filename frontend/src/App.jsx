import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  // Day 5: Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // Day 6: Add a new task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setAdding(true);
    try {
      const res = await axios.post(`${API_BASE}/add`, { text: text.trim() });
      setTasks((prev) => [...prev, res.data]);
      setText("");
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Failed to add task. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="app-wrapper">
      {/* Animated background blobs */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />

      <main className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo-mark" aria-hidden="true">✦</div>
          <h1 className="app-title">Doable</h1>
          <p className="app-subtitle">Stay focused. Stay productive.</p>

          {/* Task counter pill */}
          {!loading && totalCount > 0 && (
            <div className="task-counter">
              <span className="counter-dot" aria-hidden="true" />
              {totalCount} {totalCount === 1 ? "task" : "tasks"}
            </div>
          )}
        </header>

        {/* Input Form */}
        <form id="add-task-form" onSubmit={handleAddTask} className="input-form">
          <div className="input-wrapper">
            <span className="input-icon" aria-hidden="true">＋</span>
            <input
              id="task-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What needs to be done?"
              autoComplete="off"
              disabled={adding}
              aria-label="New task input"
            />
          </div>
          <button
            id="add-task-btn"
            type="submit"
            className={`add-btn ${adding ? "adding" : ""}`}
            disabled={adding || !text.trim()}
            aria-label="Add task"
          >
            {adding ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : (
              "Add Task"
            )}
          </button>
        </form>

        {/* Error Banner */}
        {error && (
          <div className="error-banner" role="alert">
            <span>⚠</span> {error}
            <button className="error-dismiss" onClick={() => setError(null)} aria-label="Dismiss error">✕</button>
          </div>
        )}

        {/* Task List */}
        <section className="task-section" aria-label="Task list">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" aria-label="Loading tasks" />
              <p>Loading your tasks…</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">📋</div>
              <p className="empty-title">All clear!</p>
              <p className="empty-desc">Add a task above to get started.</p>
            </div>
          ) : (
            <ul className="task-list" id="task-list">
              {tasks.map((t, index) => (
                <li
                  key={t._id}
                  className="task-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="task-bullet" aria-hidden="true" />
                  <span className="task-text">{t.text}</span>
                  <span className="task-badge" aria-label="Task saved">✓</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer */}
        <footer className="app-footer">
          <span>Built with React & Node.js</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
