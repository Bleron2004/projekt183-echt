const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const SECRET_KEY = "dein_geheimer_schlüssel"; // 🔹 Speichere diesen Wert in einer .env-Datei

let db;

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", getFeed);
  app.post("/api/feed", authenticateToken, postTweet); // 🔹 Geschützter Endpunkt
  app.post("/api/login", login);
};

// 🔹 Middleware zur Token-Überprüfung
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // "Bearer TOKEN"
  if (!token) return res.status(403).json({ message: "Kein Token vorhanden" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Ungültiges Token" });
    req.user = user;
    next();
  });
};

// 🔹 Öffentliche Feed-Abfrage (kein Schutz erforderlich)
const getFeed = async (req, res) => {
  const query = req.query.q;
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

// 🔹 Post erstellen (nur mit gültigem Token)
const postTweet = (req, res) => {
  insertDB(db, req.body.query);
  res.json({ status: "ok" });
};

// 🔹 Login mit JWT-Token
const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  const user = await queryDB(db, query);

  if (user.length === 1) {
    // JWT-Token erstellen
    const token = jwt.sign({ id: user[0].id, username: user[0].username }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Ungültige Zugangsdaten" });
  }
};

module.exports = { initializeAPI };
