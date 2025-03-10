const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const sanitizer = require("express-sanitizer");

const SECRET_KEY = "dein_geheimer_schlüssel";

let db;

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Zu viele fehlgeschlagene Login-Versuche. Bitte warte 15 Minuten.",
  headers: true,
});

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.use(sanitizer());
  app.get("/api/feed", getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
  app.post("/api/login", loginLimiter, login);
};

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "Kein Token vorhanden" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Ungültiges Token" });
    req.user = user;
    next();
  });
};

const getFeed = async (req, res) => {
  const query = "SELECT username, timestamp, text FROM tweets ORDER BY id DESC";
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

const postTweet = (req, res) => {
  const sanitizedText = escapeHtml(req.body.text);
  const username = req.user.username; // 🔹 Der eingeloggte User wird automatisch gesetzt
  const timestamp = new Date().toISOString();

  const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)`;

  insertDB(db, query, [username, timestamp, sanitizedText])
      .then(() => {
        res.json({ status: "Tweet gespeichert!", text: sanitizedText });
      })
      .catch((error) => {
        console.error(" Fehler beim Speichern des Tweets:", error);
        res.status(500).json({ message: "Fehler beim Speichern des Tweets" });
      });
};


const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  const user = await queryDB(db, query, [username, password]);

  if (user.length === 1) {
    const token = jwt.sign({ id: user[0].id, username: user[0].username }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Ungültige Zugangsdaten" });
  }
};

module.exports = { initializeAPI };
