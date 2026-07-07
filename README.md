# MERN Stack To-Do List Application

**Live Demo:** [https://doable-tasks.onrender.com](https://doable-tasks.onrender.com)

A beautifully designed, full-stack To-Do list built using the MERN stack (MongoDB, Express.js, React.js, Node.js) as part of Task 2.

## Features
- **Full CRUD Functionality**: Create, Read, Update, and Delete tasks instantly.
- **Categories & Priorities**: Organize your tasks by category (Personal, Work, etc.) and priority (High, Medium, Low).
- **Drag & Drop Reordering**: Easily reorder tasks by dragging and dropping them into place.
- **Due Dates & Reminders**: Set due dates and browser notifications for your tasks.
- **Progress Tracking**: See a visual progress ring of your completed tasks.
- **Modern UI**: Features a sleek light/dark mode with glassmorphism design, micro-animations, and confetti celebrations.
- **Responsive**: Works and looks great on all device sizes.

## Technologies Used
- **Frontend**: React (Vite), Axios, CSS3 (Custom Properties, Flexbox, Animations).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas, Mongoose.

## Getting Started Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/mahitharangana/TO-DO-LIST.git
cd TO-DO-LIST
```

### 2. Setup the Backend
Open a terminal and navigate to the backend directory:
```bash
cd backend
npm install
```

Make sure your `.env` file in the `backend` directory contains your MongoDB URI:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
```

Start the backend server:
```bash
node server.js
```
*You should see "Server running on port 5000" and "MongoDB Connected".*

### 3. Setup the Frontend
Open a **new** terminal window and navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
*Your React app will typically be running on `http://localhost:5173`.*

## License
MIT
