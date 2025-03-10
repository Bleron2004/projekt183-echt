const sqlite3 = require("sqlite3").verbose();

const tweetsTableExists =
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tweets'";
const createTweetsTable = `
  CREATE TABLE IF NOT EXISTS tweets (
                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                      username TEXT NOT NULL,
                                      timestamp TEXT NOT NULL,
                                      text TEXT NOT NULL
  )`;

const usersTableExists =
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'";
const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     username TEXT NOT NULL UNIQUE,
                                     password TEXT NOT NULL
  )`;

const bcrypt = require("bcrypt");
const saltRounds = 10;

const seedUsersTable = async (db) => {
  const users = [
    { username: "switzerchees", password: "123456" },
    { username: "john", password: "123456" },
    { username: "jane", password: "123456" }
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, [user.username, hashedPassword]);
  }
};

const initializeDatabase = async () => {
  const db = new sqlite3.Database("./minitwitter.db");

  db.serialize(() => {
    db.get(tweetsTableExists, [], (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        db.run(createTweetsTable);
      }
    });
    db.get(usersTableExists, [], (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        db.run(createUsersTable, [], (err) => {
          if (err) return console.error(err.message);
          db.run(seedUsersTable);
        });
      }
    });
  });

  return db;
};

const insertDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
};

const queryDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = { initializeDatabase, queryDB, insertDB };
