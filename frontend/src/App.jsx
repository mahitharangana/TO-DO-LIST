import React, { useState } from "react";

function App() {
  const [tasks, setTasks] = useState([
    { _id: "1", text: "Buy groceries" },
    { _id: "2", text: "Walk the dog" },
    { _id: "3", text: "Complete MERN Task 2" }
  ]);
  const [text, setText] = useState("");

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!text.trim()) return alert("Task cannot be empty!");
    
    // For Day 4, we just update the UI state. Real backend logic happens in Day 5/6.
    const newTask = { _id: Date.now().toString(), text };
    setTasks([...tasks, newTask]);
    setText("");
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
    </div>
  );
}

export default App;
