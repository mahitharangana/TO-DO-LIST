import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks from backend on component mount (Day 5)
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/tasks");
      setTasks(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Add new task (Day 6)
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!text.trim()) return alert("Task cannot be empty!");
    
    try {
      const res = await axios.post("http://localhost:5000/add", { text });
      // Update UI with the new task directly to avoid a full re-fetch
      setTasks([...tasks, res.data]);
      setText("");
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task.");
    }
  };

  return (
    <div className="app-container">
      <h1>MERN To-Do</h1>
      <p className="subtitle">Your daily tasks, beautifully organized.</p>
      
      <form onSubmit={handleAddTask} className="input-group">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="What do you need to do?" 
        />
        <button type="submit" className="add-btn">Add</button>
      </form>

      {error && <div className="error-message" style={{color: '#ef4444', textAlign: 'center', marginBottom: '1rem'}}>{error}</div>}

      {loading ? (
        <div style={{textAlign: 'center', color: '#94a3b8'}}>Loading tasks...</div>
      ) : (
        <ul className="task-list">
          {tasks.length > 0 ? (
            tasks.map((t) => (
              <li key={t._id} className="task-item">
                <span className="task-text">{t.text}</span>
              </li>
            ))
          ) : (
            <div className="empty-state">No tasks yet. Add one above!</div>
          )}
        </ul>
      )}
    </div>
  );
}

export default App;
