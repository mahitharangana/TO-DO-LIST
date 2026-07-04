import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import CursorParticles from "./CursorParticles";

const API = "http://localhost:5000";

const CATEGORIES = ["Personal", "Work", "Study", "Health", "Shopping"];
const FILTERS    = ["All", ...CATEGORIES];

const CAT = {
  Personal: { emoji: "🧘", color: "#8b5cf6", bg: "#f5f3ff" },
  Work:     { emoji: "💼", color: "#3b82f6", bg: "#eff6ff" },
  Study:    { emoji: "📚", color: "#f59e0b", bg: "#fffbeb" },
  Health:   { emoji: "🏃", color: "#10b981", bg: "#ecfdf5" },
  Shopping: { emoji: "🛒", color: "#f43f5e", bg: "#fff1f2" },
};

const QUOTES = [
  { text: "Done is better than perfect.", author: "— Mark Zuckerberg" },
  { text: "Focus on being productive instead of busy.", author: "— Tim Ferriss" },
  { text: "Small steps every day lead to big results.", author: "— Anonymous" },
  { text: "Your future self is watching. Make them proud.", author: "— Anonymous" },
  { text: "One task at a time. You got this! 💪", author: "— Doable" },
  { text: "Progress, not perfection.", author: "— Anonymous" },
  { text: "Every completed task is a win.", author: "— Doable" },
  { text: "The secret is to begin.", author: "— Mark Twain" },
];

const MILESTONES = {
  1:  "First task added! 🎉",
  3:  "3 tasks! You're organized! 📋",
  5:  "5 tasks! Keep it up! 💪",
  10: "10 tasks! You're a legend! 🏆",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { msg: "Good Morning", emoji: "☀️" };
  if (h < 17) return { msg: "Good Afternoon", emoji: "👋" };
  return { msg: "Good Evening", emoji: "🌙" };
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// Web Audio API: short pleasant chime
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime);        // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);  // E5
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);  // G5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (_) { /* silent fail */ }
}

// Confetti burst from the middle
function fireConfetti() {
  const count = 150;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };
  function fire(ratio, opts) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
  }
  fire(0.25, { spread: 26, startVelocity: 55, colors: ["#8b5cf6", "#6366f1"] });
  fire(0.2,  { spread: 60, colors: ["#f59e0b", "#fbbf24"] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#f43f5e", "#fb7185"] });
  fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ["#10b981", "#34d399"] });
  fire(0.1,  { spread: 120, startVelocity: 45, colors: ["#3b82f6", "#60a5fa"] });
}

function fireAllDoneConfetti() {
  const end = Date.now() + 2000;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#6366f1","#f43f5e","#f59e0b"] });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#10b981","#3b82f6","#8b5cf6"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function App() {
  const [tasks,        setTasks]       = useState([]);
  const [text,         setText]        = useState("");
  const [category,     setCategory]    = useState("Personal");
  const [filter,       setFilter]      = useState("All");
  const [search,       setSearch]      = useState("");
  const [loading,      setLoading]     = useState(true);
  const [adding,       setAdding]      = useState(false);
  const [error,        setError]       = useState(null);
  const [toast,        setToast]       = useState(null);
  const [shake,        setShake]       = useState(false);
  const [editingId,    setEditingId]   = useState(null);
  const [editText,     setEditText]    = useState("");
  const [quoteIdx,     setQuoteIdx]    = useState(0);
  const [allDone,      setAllDone]     = useState(false);
  const [removingId,   setRemovingId]  = useState(null);
  const prevDoneCount = useRef(0);

  const { msg, emoji } = getGreeting();

  // Rotate quotes every 8 seconds
  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  // Browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Reminder checker every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(t => {
        if (!t.completed && t.reminderAt) {
          const diff = now - new Date(t.reminderAt);
          if (diff >= 0 && diff < 10000) {
            if (Notification.permission === "granted") {
              new Notification(`⏰ Reminder!`, { body: t.text, icon: "/favicon.ico" });
            }
            showToast(`⏰ Reminder: "${t.text}"`, "reminder");
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  // All-done celebration
  useEffect(() => {
    const done = tasks.filter(t => t.completed).length;
    if (tasks.length > 0 && done === tasks.length && done > prevDoneCount.current) {
      setAllDone(true);
      fireAllDoneConfetti();
      setTimeout(() => setAllDone(false), 4000);
    }
    prevDoneCount.current = done;
  }, [tasks]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true); setError(null);
      const res = await axios.get(`${API}/tasks`);
      setTasks(res.data);
    } catch { setError("Can't reach the server. Is the backend running?"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setAdding(true);
    try {
      const res = await axios.post(`${API}/add`, { text: text.trim(), category });
      setTasks(p => [res.data, ...p]);
      setText("");
      const newTotal = tasks.length + 1;
      if (MILESTONES[newTotal]) showToast(MILESTONES[newTotal], "milestone");
      else showToast("Task added! ✅", "success");
    } catch { setError("Failed to add task."); }
    finally  { setAdding(false); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await axios.patch(`${API}/tasks/${id}/toggle`);
      setTasks(p => p.map(t => t._id === id ? res.data : t));
      if (res.data.completed) {
        fireConfetti();
        playChime();
        showToast("Task completed! 🎉", "success");
      }
    } catch { setError("Failed to update task."); }
  };

  const handleDelete = async (id) => {
    setRemovingId(id);
    setTimeout(async () => {
      try {
        await axios.delete(`${API}/tasks/${id}`);
        setTasks(p => p.filter(t => t._id !== id));
        setRemovingId(null);
      } catch { setError("Failed to delete task."); setRemovingId(null); }
    }, 300); // let CSS animation play
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      const res = await axios.patch(`${API}/tasks/${id}`, { text: editText });
      setTasks(p => p.map(t => t._id === id ? res.data : t));
      setEditingId(null);
      showToast("Task updated! ✏️", "success");
    } catch { setError("Failed to edit task."); }
  };

  const handleSetReminder = async (id, val) => {
    try {
      const res = await axios.patch(`${API}/tasks/${id}`, { reminderAt: val ? new Date(val) : null });
      setTasks(p => p.map(t => t._id === id ? res.data : t));
      if (val) showToast("Reminder set! ⏰", "reminder");
    } catch { setError("Failed to set reminder."); }
  };

  const filtered = useMemo(() =>
    tasks.filter(t =>
      (filter === "All" || t.category === filter) &&
      t.text.toLowerCase().includes(search.toLowerCase())
    ), [tasks, filter, search]);

  const total   = tasks.length;
  const done    = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = tasks.filter(t => t.category === c).length;
    return acc;
  }, {});

  const quote = QUOTES[quoteIdx];

  return (
    <div className="root">
      {/* Background */}
      <CursorParticles />
      <div className="bg-layer" aria-hidden="true">
        <div className="orb o1"/><div className="orb o2"/>
        <div className="orb o3"/><div className="orb o4"/>
        <div className="grid-dots"/>
      </div>

      {/* All-done banner */}
      {allDone && (
        <div className="all-done-banner">
          <span className="all-done-emoji">🏆</span>
          <div>
            <p className="all-done-title">Everything done!</p>
            <p className="all-done-sub">You're absolutely crushing it today!</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <span className="brand-name">Doable</span>
        </div>

        <div className="greeting">
          <p className="greet-sub">{emoji} {msg}</p>
          <h1 className="greet-title">Let's crush<br/>your goals!</h1>
          <p className="greet-date">{formatDate()}</p>
        </div>

        {/* Progress ring */}
        <div className="progress-ring-wrap">
          <svg viewBox="0 0 100 100" className="ring-svg">
            <circle className="ring-bg" cx="50" cy="50" r="40"/>
            <circle className="ring-fill" cx="50" cy="50" r="40"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
              style={{ stroke: pct === 100 ? "#10b981" : pct > 50 ? "#f59e0b" : "#6366f1" }}
            />
          </svg>
          <div className="ring-label">
            <span className="ring-pct" style={{ color: pct === 100 ? "#10b981" : "inherit" }}>
              {pct === 100 ? "🎉" : `${pct}%`}
            </span>
            <span className="ring-sub">{pct === 100 ? "all done!" : "done"}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="sidebar-stats">
          <div className="sstat total"><span className="sstat-num">{total}</span><span className="sstat-lbl">📋 Total</span></div>
          <div className="sstat done-card"><span className="sstat-num">{done}</span><span className="sstat-lbl">✅ Done</span></div>
          <div className="sstat pend-card"><span className="sstat-num">{pending}</span><span className="sstat-lbl">⏳ Left</span></div>
        </div>

        {/* Motivational Quote */}
        <div className="quote-box" key={quoteIdx}>
          <p className="quote-text">"{quote.text}"</p>
          <p className="quote-author">{quote.author}</p>
        </div>

        {/* Category Nav */}
        <nav className="cat-nav">
          <p className="cat-nav-title">Categories</p>
          {CATEGORIES.map(c => (
            <button key={c} className={`cat-item ${filter === c ? "active" : ""}`}
              onClick={() => setFilter(filter === c ? "All" : c)}
              style={filter === c ? { background: CAT[c].color, color: "#fff" } : {}}>
              <span className="cat-dot" style={{ background: CAT[c].color }}/>
              <span>{CAT[c].emoji} {c}</span>
              <span className="cat-count">{catCounts[c] || 0}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">Built with React & Node.js 🚀</div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="page-title">My Tasks</h2>
            {!loading && <span className="task-pill">{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</span>}
          </div>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…" className="search-input"/>
            {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
          </div>
        </header>

        {error && <div className="error-bar">⚠️ {error} <button onClick={() => setError(null)}>✕</button></div>}

        {/* Add Form */}
        <form onSubmit={handleAdd} className={`add-form ${shake ? "shake" : ""}`}>
          <span className="add-form-icon">✏️</span>
          <input type="text" value={text} onChange={e => setText(e.target.value)}
            placeholder="What needs to be done today?" disabled={adding} className="add-input"/>
          <select value={category} onChange={e => setCategory(e.target.value)}
            disabled={adding} className="add-select">
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT[c].emoji} {c}</option>)}
          </select>
          <button id="add-task-btn" type="submit" disabled={adding || !text.trim()}>
            {adding ? <span className="btn-spin"/> : "＋ Add Task"}
          </button>
        </form>

        {/* Filters */}
        <div className="filter-row">
          {FILTERS.map(f => (
            <button key={f} className={`ftab ${filter === f ? "ftab-on" : ""}`}
              onClick={() => setFilter(f)}
              style={filter === f && f !== "All" ? { background: CAT[f].color, borderColor: CAT[f].color, color: "#fff" } : {}}>
              {f !== "All" && CAT[f].emoji + " "}{f}
              {f !== "All" && <span className="ftab-badge">{catCounts[f] || 0}</span>}
            </button>
          ))}
        </div>

        {/* Task List */}
        <section className="task-section">
          {loading ? (
            <div className="state-box"><div className="spinner"/><p>Loading your tasks…</p></div>
          ) : filtered.length === 0 ? (
            <div className="state-box">
              <div className="empty-art" style={{ animation: "bounce 2s ease-in-out infinite" }}>
                {search ? "🔍" : "🎯"}
              </div>
              <p className="empty-msg">{search ? "No tasks match your search" : filter === "All" ? "No tasks yet — add your first one!" : `No ${filter} tasks yet!`}</p>
              <p className="empty-hint">{!search && "Use the form above to get started ↑"}</p>
            </div>
          ) : (
            <ul className="task-list">
              {filtered.map((t, i) => {
                const meta = CAT[t.category] || CAT.Personal;
                const isEditing = editingId === t._id;
                const isRemoving = removingId === t._id;

                return (
                  <li key={t._id}
                    className={`task-item ${t.completed ? "item-done" : ""} ${isRemoving ? "item-removing" : ""}`}
                    style={{ "--c": meta.color, animationDelay: `${i * 0.05}s` }}>

                    {/* Checkbox */}
                    <button className={`cb ${t.completed ? "cb-done" : ""}`}
                      onClick={() => handleToggle(t._id)}
                      style={{ borderColor: t.completed ? "#10b981" : meta.color }}
                      title={t.completed ? "Mark incomplete" : "Mark complete"}>
                      {t.completed && <span className="cb-check">✓</span>}
                    </button>

                    {/* Content */}
                    <div className="item-content">
                      {isEditing ? (
                        <input autoFocus className="edit-input" value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(t._id); if (e.key === "Escape") setEditingId(null); }}
                          onBlur={() => handleSaveEdit(t._id)}/>
                      ) : (
                        <span className="item-text" onDoubleClick={() => { setEditingId(t._id); setEditText(t.text); }}>
                          {t.text}
                        </span>
                      )}
                      <div className="item-tags-row">
                        <span className="item-tag"
                          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                          {meta.emoji} {t.category}
                        </span>
                        {t.reminderAt && !t.completed && (
                          <span className="reminder-tag">
                            ⏰ {new Date(t.reminderAt).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="task-actions">
                      <label className="action-btn reminder-btn" title="Set Reminder">
                        ⏰
                        <input type="datetime-local" className="hidden-dt"
                          value={t.reminderAt ? new Date(t.reminderAt).toISOString().slice(0,16) : ""}
                          onChange={e => handleSetReminder(t._id, e.target.value)}/>
                      </label>
                      <button className="action-btn edit-btn" title="Edit task"
                        onClick={() => { setEditingId(t._id); setEditText(t.text); }}>
                        ✏️
                      </button>
                      <button className="action-btn del-btn" title="Delete task"
                        onClick={() => handleDelete(t._id)}>
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
