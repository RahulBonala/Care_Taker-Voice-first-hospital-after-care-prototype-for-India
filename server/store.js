'use strict';
// JSON file store. data/db.json is created and seeded on first start.
const fs = require('fs');
const path = require('path');
const { seed } = require('./seed');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
let db = null;

function load() {
  try {
    if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.warn('data/db.json could not be read, seeding again:', err.message);
    db = null;
  }
  if (!db) { db = seed(); save(); }
  // Files saved before health devices existed get empty lists.
  db.devices = db.devices || [];
  db.readings = db.readings || [];
  return db;
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, FILE);
}

function reset() { db = seed(); save(); return db; }
function get() { return db || load(); }

module.exports = { load, save, reset, get, FILE };
