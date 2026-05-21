'use strict';

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// File-based storage
const DB_FILE = path.join(__dirname, 'db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return { users: [] };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users — create new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ error: 'username required' });

  const db = loadDB();
  const newUser = { _id: generateId(), username, exercises: [] };
  db.users.push(newUser);
  saveDB(db);

  res.json({ username: newUser.username, _id: newUser._id });
});

// GET /api/users — get all users
app.get('/api/users', (req, res) => {
  const db = loadDB();
  const users = db.users.map(u => ({ username: u.username, _id: u._id }));
  res.json(users);
});

// POST /api/users/:_id/exercises — add exercise
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const db = loadDB();
  const user = db.users.find(u => u._id === _id);
  if (!user) return res.json({ error: 'user not found' });

  const exerciseDate = date ? new Date(date) : new Date();

  const exercise = {
    description: description,
    duration: parseInt(duration),
    date: exerciseDate.toDateString()
  };

  user.exercises.push(exercise);
  saveDB(db);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id
  });
});

// GET /api/users/:_id/logs — get exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const db = loadDB();
  const user = db.users.find(u => u._id === _id);
  if (!user) return res.json({ error: 'user not found' });

  let log = user.exercises.map(e => ({
    description: String(e.description),
    duration: Number(e.duration),
    date: e.date
  }));

  if (from) {
    const fromDate = new Date(from);
    log = log.filter(e => new Date(e.date) >= fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    log = log.filter(e => new Date(e.date) <= toDate);
  }

  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Exercise Tracker running on port ' + PORT));

module.exports = app;
