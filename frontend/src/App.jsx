import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API = import.meta.env.PROD ? "" : "http://localhost:5000";

const CATEGORIES = ["Personal", "Work", "Study", "Health", "Shopping"];
const FILTERS = ["All", ...CATEGORIES];

const CAT = {
  Personal: { emoji: "🧘", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  Work: { emoji: "💼", color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  Study: { emoji: "📚", color: "#9B7653", bg: "rgba(155,118,83,0.12)" },
  Health: { emoji: "🏃", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  Shopping: { emoji: "🛒", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const PRIORITY = {
  High: { emoji: "!", color: "#dc2626", bg: "rgba(220,38,38,0.1)", label: "High" },
  Medium: { emoji: "·", color: "#6B7280", bg: "rgba(107,114,128,0.1)", label: "Medium" },
  Low: { emoji: "·", color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "Low" },
};

const QUOTES = [
  { text: "Done is better than perfect.", author: "Mark Zuckerberg" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Small steps every day lead to big results.", author: "Anonymous" },
  { text: "Your future self is watching. Make them proud.", author: "Anonymous" },
  { text: "One task at a time. You got this.", author: "Doable" },
  { text: "Progress, not perfection.", author: "Anonymous" },
  { text: "Every completed task is a win.", author: "Doable" },
  { text: "The secret is to begin.", author: "Mark Twain" },
];

const MILESTONES = {
  1: "First task added! 🎉",
  3: "3 tasks — you're organized!",
  5: "5 tasks — keep it up!",
  10: "10 tasks — you're a legend!",
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

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < new Date();
}

function formatDueDate(dueDate) {
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function formatLocalForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function playChime() {
  if (localStorage.getItem("doable-sound") === "false") return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (_) { }
}

function fireConfetti() {
  const count = 120;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };
  function fire(ratio, opts) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
  }
  fire(0.4, { spread: 60, colors: ["#10b981", "#34d399", "#6ee7b7"] });
  fire(0.3, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#064e3b", "#065f46"] });
  fire(0.3, { spread: 80, startVelocity: 45, colors: ["#d1fae5", "#a7f3d0"] });
}

function fireAllDoneConfetti() {
  const end = Date.now() + 2000;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#10b981", "#34d399", "#6ee7b7"] });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#064e3b", "#065f46", "#d1fae5"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ── Sortable Task Item ──────────────────────────────────────────────────────
function SortableTaskItem({ task, onToggle, onDelete, onEdit, onSaveEdit, onSetReminder, onPin, editingId, editText, setEditText, removingId }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  const meta = CAT[task.category] || CAT.Personal;
  const prio = PRIORITY[task.priority] || PRIORITY.Medium;
  const isEditing = editingId === task._id;
  const isRemoving = removingId === task._id;
  const overdue = isOverdue(task);

  return (
    <li
      ref={setNodeRef}
      style={{ ...style, "--accent-c": prio.color }}
      className={`task-item ${task.completed ? "item-done" : ""} ${isRemoving ? "item-removing" : ""} ${overdue ? "item-overdue" : ""} ${task.pinned ? "item-pinned" : ""}`}
    >
      {/* Priority stripe */}
      <span className="priority-stripe" style={{ background: prio.color }} />

      {/* Drag handle */}
      <span className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⋮⋮</span>

      {/* Checkbox */}
      <button
        className={`cb ${task.completed ? "cb-done" : ""}`}
        onClick={() => onToggle(task._id)}
        title={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed && <span className="cb-check">✓</span>}
      </button>

      {/* Content */}
      <div className="item-content">
        {isEditing ? (
          <input autoFocus className="edit-input" value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSaveEdit(task._id); if (e.key === "Escape") onEdit(null); }}
            onBlur={() => onSaveEdit(task._id)} />
        ) : (
          <span className="item-text" onDoubleClick={() => { onEdit(task._id); setEditText(task.text); }}>
            {task.text}
          </span>
        )}
        <div className="item-tags-row">
          {task.pinned && <span className="item-tag pin-badge">📌 Pinned</span>}
          {task.pinned && <span className="tag-sep">·</span>}
          <span className="item-tag prio-tag" style={{ color: prio.color }}>
            {task.priority}
          </span>
          <span className="tag-sep">·</span>
          <span className="item-tag cat-tag">{meta.emoji} {task.category}</span>
          {task.dueDate && !task.completed && (
            <>
              <span className="tag-sep">·</span>
              <span className={`item-tag due-tag ${overdue ? "due-overdue" : ""}`}>
                {overdue ? "⚠ " : "📅 "}{formatDueDate(task.dueDate)}
              </span>
            </>
          )}
          {task.reminderAt && !task.completed && (
            <>
              <span className="tag-sep">·</span>
              <span className="item-tag reminder-tag">
                ⏰ {new Date(task.reminderAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="task-actions">
        <button
          className={`action-btn pin-btn ${task.pinned ? "pin-btn-active" : ""}`}
          title={task.pinned ? "Unpin task" : "Pin to top"}
          onClick={() => onPin(task._id)}
        >{task.pinned ? "★" : "☆"}</button>
        <label className="action-btn reminder-btn" title="Set Reminder">
          ⏰
          <input type="datetime-local" className="hidden-dt"
            value={formatLocalForInput(task.reminderAt)}
            onChange={e => onSetReminder(task._id, e.target.value)} />
        </label>
        <button className="action-btn edit-btn" title="Edit"
          onClick={() => { onEdit(task._id); setEditText(task.text); }}>✏</button>
        <button className="action-btn del-btn" title="Delete"
          onClick={() => onDelete(task._id)}>✕</button>
      </div>
    </li>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Personal");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [shake, setShake] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("doable-dark");
    return saved !== null ? saved === "true" : true; // Default to true (Dark Mode)
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("doable-sound") !== "false");
  const prevDoneCount = useRef(0);
  const tasksRef = useRef([]);
  const firedReminders = useRef(new Set());

  useEffect(() => { localStorage.setItem("doable-sound", soundEnabled); }, [soundEnabled]);

  // Keep tasksRef always in sync without affecting intervals
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("doable-dark", darkMode);
  }, [darkMode]);

  const { msg, emoji } = getGreeting();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Reminder checker — runs every 10s, 60s catch window, never fires twice
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tasksRef.current.forEach(t => {
        if (!t.completed && t.reminderAt) {
          const key = `${t._id}::${t.reminderAt}`;
          if (firedReminders.current.has(key)) return;
          const diff = now - new Date(t.reminderAt);
          if (diff >= 0 && diff < 60000) {          // 60-second catch window
            firedReminders.current.add(key);        // mark as fired — never repeats
            try {
              if (Notification.permission === "granted") {
                new Notification("⏰ Reminder", { body: t.text });
              }
            } catch (err) {
              console.warn("Notification error:", err);
            }
            playChime();
            showToast(`⏰ Reminder: "${t.text}"`, "reminder");
          }
        }
      });
    }, 10000);                                      // check every 10 seconds
    return () => clearInterval(interval);
  }, [showToast]);                                  // never re-mounts on task changes

  useEffect(() => {
    const done = tasks.filter(t => t.completed).length;
    if (tasks.length > 0 && done === tasks.length && done > prevDoneCount.current) {
      setAllDone(true);
      fireAllDoneConfetti();
      setTimeout(() => setAllDone(false), 4000);
    }
    prevDoneCount.current = done;
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true); setError(null);
      const res = await axios.get(`${API}/tasks`);
      setTasks(res.data);
    } catch { setError("Can't reach the server. Is the backend running?"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    setAdding(true);
    try {
      const payload = { text: text.trim(), category, priority };
      if (dueDate) payload.dueDate = new Date(dueDate);
      const res = await axios.post(`${API}/add`, payload);
      setTasks(p => [res.data, ...p]);
      setText(""); setDueDate("");
      const newTotal = tasks.length + 1;
      if (MILESTONES[newTotal]) showToast(MILESTONES[newTotal], "milestone");
      else showToast("Task added", "success");
    } catch { setError("Failed to add task."); }
    finally { setAdding(false); }
  };

  const handleToggle = async (id) => {
    const task = tasks.find(t => t._id === id);
    if (!task) return;
    const isCompleting = !task.completed;
    
    // Optimistic update
    setTasks(p => p.map(t => t._id === id ? { ...t, completed: isCompleting } : t));
    if (isCompleting) { fireConfetti(); playChime(); showToast("Done! ✓", "success"); }

    try {
      const res = await axios.patch(`${API}/tasks/${id}/toggle`);
      setTasks(p => p.map(t => t._id === id ? res.data : t));
    } catch {
      // Revert on failure
      setTasks(p => p.map(t => t._id === id ? { ...t, completed: !isCompleting } : t));
      setError("Failed to update task.");
    }
  };

  const handleDelete = async (id) => {
    setRemovingId(id);
    setTimeout(async () => {
      try {
        await axios.delete(`${API}/tasks/${id}`);
        setTasks(p => p.filter(t => t._id !== id));
        setRemovingId(null);
      } catch { setError("Failed to delete task."); setRemovingId(null); }
    }, 300);
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      const res = await axios.patch(`${API}/tasks/${id}`, { text: editText });
      setTasks(p => p.map(t => t._id === id ? res.data : t));
      setEditingId(null);
      showToast("Updated", "success");
    } catch { setError("Failed to edit task."); }
  };

  const handleSetReminder = async (id, val) => {
    try {
      const res = await axios.patch(`${API}/tasks/${id}`, { reminderAt: val ? new Date(val) : null });
      setTasks(p => p.map(t => t._id === id ? res.data : t));
      if (val) showToast("Reminder set ⏰", "reminder");
    } catch { setError("Failed to set reminder."); }
  };

  const handlePin = async (id) => {
    const task = tasks.find(t => t._id === id);
    if (!task) return;
    // Optimistic update
    setTasks(p => p.map(t => t._id === id ? { ...t, pinned: !t.pinned } : t));
    try {
      const res = await axios.patch(`${API}/tasks/${id}/pin`);
      setTasks(p => p.map(t => t._id === id ? res.data : t));
      showToast(res.data.pinned ? "📌 Task pinned!" : "Unpinned", "success");
    } catch {
      // Revert on failure
      setTasks(p => p.map(t => t._id === id ? { ...t, pinned: task.pinned } : t));
      setError("Failed to pin task.");
    }
  };

  const handleClearCompleted = async () => {
    try {
      await axios.delete(`${API}/tasks/completed/all`);
      setTasks(p => p.filter(t => !t.completed));
      showToast("Cleared completed tasks", "success");
    } catch { setError("Failed to clear completed."); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTasks(prev => {
      const oldIdx = prev.findIndex(t => t._id === active.id);
      const newIdx = prev.findIndex(t => t._id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      const updates = reordered.map((t, i) => ({ id: t._id, order: i }));
      axios.patch(`${API}/tasks/reorder/bulk`, updates).catch(() => { });
      return reordered;
    });
  };

  const filtered = useMemo(() => {
    const list = tasks.filter(t =>
      (filter === "All" || t.category === filter) &&
      t.text.toLowerCase().includes(search.toLowerCase())
    );
    // Pinned tasks always appear first
    return [...list.filter(t => t.pinned), ...list.filter(t => !t.pinned)];
  }, [tasks, filter, search]);

  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const pending = total - done;
  const overdueCount = tasks.filter(t => isOverdue(t)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = tasks.filter(t => t.category === c).length;
    return acc;
  }, {});

  const quote = QUOTES[quoteIdx];

  return (
    <div className="root">
      {/* All-done banner */}
      {allDone && (
        <div className="all-done-banner">
          <span className="all-done-emoji">✓</span>
          <div>
            <p className="all-done-title">All done!</p>
            <p className="all-done-sub">You crushed it today.</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* ══ SIDEBAR ══ */}
      {mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={`sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        {/* Brand */}
        <div className="brand">
          <span className="brand-name">Doable</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button className="dark-toggle" onClick={() => setDarkMode(d => !d)}
              title={darkMode ? "Light mode" : "Dark mode"}>
              {darkMode ? "☀" : "◑"}
            </button>
            <button className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>✕</button>
          </div>
        </div>
        <p className="brand-tagline">— Do more. Miss nothing.</p>

        <div className="sidebar-divider">···</div>

        <div className="greeting">
          <p className="greet-sub">{emoji} {msg}</p>
          <h1 className="greet-title">Let's get<br />things done.</h1>
          <p className="greet-date">{formatDate()}</p>
        </div>

        {/* Progress ring */}
        <div className="progress-ring-wrap">
          <svg viewBox="0 0 100 100" className="ring-svg">
            <circle className="ring-bg" cx="50" cy="50" r="40" />
            <circle className="ring-fill" cx="50" cy="50" r="40"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
            />
          </svg>
          <div className="ring-label">
            <span className="ring-pct">{pct === 100 ? "✓" : `${pct}%`}</span>
            <span className="ring-sub">{pct === 100 ? "all done" : "done"}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="sidebar-stats">
          <div className="sstat"><span className="sstat-num">{total}</span><span className="sstat-lbl">Total</span></div>
          <div className="sstat sstat-done"><span className="sstat-num">{done}</span><span className="sstat-lbl">Done</span></div>
          <div className="sstat sstat-pend"><span className="sstat-num">{pending}</span><span className="sstat-lbl">Left</span></div>
        </div>

        {overdueCount > 0 && (
          <div className="overdue-alert">⚠ {overdueCount} overdue</div>
        )}

        <div className="sidebar-divider">···</div>

        {/* Quote */}
        <div className="quote-box" key={quoteIdx}>
          <p className="quote-text">"{quote.text}"</p>
          <p className="quote-author">— {quote.author}</p>
        </div>

        <div className="sidebar-divider">···</div>

        {/* Category Nav */}
        <nav className="cat-nav">
          <p className="cat-nav-title">Categories</p>
          {CATEGORIES.map(c => (
            <button key={c} className={`cat-item ${filter === c ? "active" : ""}`}
              onClick={() => { setFilter(filter === c ? "All" : c); setMobileSidebarOpen(false); }}>
              <span className="cat-dot" style={{ background: CAT[c].color }} />
              <span>{CAT[c].emoji} {c}</span>
              <span className="cat-count">{catCounts[c] || 0}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">Doable · {new Date().getFullYear()}</div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)}>☰</button>
            <h2 className="page-title">My Tasks</h2>
            {!loading && <span className="task-pill">{filtered.length}</span>}
            {overdueCount > 0 && <span className="overdue-pill">⚠ {overdueCount} overdue</span>}
          </div>
          <div className="topbar-right">
            {done > 0 && (
              <button className="clear-btn" onClick={handleClearCompleted}>
                Clear done ({done})
              </button>
            )}
            <div className="topbar-actions-mobile">
              <button className="sound-toggle-main" onClick={() => setSoundEnabled(s => !s)}
                title={soundEnabled ? "Mute sound" : "Enable sound"}>
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              <div className="search-wrap">
                <span className="search-icon">⌕</span>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…" className="search-input" />
                {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
              </div>
            </div>
          </div>
        </header>

        {error && <div className="error-bar">{error} <button onClick={() => setError(null)}>✕</button></div>}

        {/* Add Form */}
        <form onSubmit={handleAdd} className={`add-form ${shake ? "shake" : ""}`}>
          <input type="text" value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a task…" disabled={adding} className="add-input" />
          <select value={priority} onChange={e => setPriority(e.target.value)}
            disabled={adding} className="add-select"
            style={{ borderLeft: `3px solid ${PRIORITY[priority].color}` }}>
            {["High", "Medium", "Low"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}
            disabled={adding} className="add-select">
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT[c].emoji} {c}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            disabled={adding} className="add-date"
            min={new Date().toISOString().split("T")[0]} />
          <button id="add-task-btn" type="submit" disabled={adding || !text.trim()}>
            {adding ? <span className="btn-spin" /> : "+ Add"}
          </button>
        </form>

        {/* Filters */}
        <div className="filter-row">
          {FILTERS.map(f => (
            <button key={f} className={`ftab ${filter === f ? "ftab-on" : ""}`}
              onClick={() => setFilter(f)}>
              {f !== "All" && CAT[f].emoji + " "}{f}
              {f !== "All" && <span className="ftab-badge">{catCounts[f] || 0}</span>}
            </button>
          ))}
        </div>

        {/* Task List */}
        <section className="task-section">
          {loading ? (
            <div className="state-box"><div className="spinner" /><p>Loading…</p></div>
          ) : filtered.length === 0 ? (
            <div className="state-box">
              <p className="empty-emoji">{search ? "⌕" : "○"}</p>
              <p className="empty-msg">{search ? "No tasks match your search." : filter === "All" ? "Nothing here yet." : `No ${filter} tasks yet.`}</p>
              <p className="empty-hint">{!search && (filter === "All" ? "Add your first task above to get started." : `Switch to All or add a ${filter} task.`)}</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(t => t._id)} strategy={verticalListSortingStrategy}>
                <ul className="task-list">
                  {filtered.map(t => (
                    <SortableTaskItem key={t._id} task={t}
                      onToggle={handleToggle} onDelete={handleDelete}
                      onEdit={(id) => setEditingId(id)} onSaveEdit={handleSaveEdit}
                      onSetReminder={handleSetReminder} onPin={handlePin}
                      editingId={editingId} editText={editText} setEditText={setEditText}
                      removingId={removingId} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </main>
    </div>
  );
}
