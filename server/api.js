const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const sanitizer = require("express-sanitizer");
const crypto = require("crypto"); // 🔹 Neu hinzugefügt für Verschlüsselung



const SECRET_KEY = "dein_geheimer_schlüssel";
const ENCRYPTION_KEY = crypto.randomBytes(32); // 🔹 Key für AES-Verschlüsselung
const IV_LENGTH = 16;
let db;

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Zu viele fehlgeschlagene Login-Versuche. Bitte warte 15 Minuten.",
  headers: true,
});

const encrypt = (text) => {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (text) => {
  let textParts = text.split(":");
  let iv = Buffer.from(textParts.shift(), "hex");
  let encryptedText = Buffer.from(textParts.join(":"), "hex");
  let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

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


const decryptedTweets = tweets.map((tweet) => ({
  ...tweet,
  text: decrypt(tweet.text),
}));

res.json(decryptedTweets);
};

const postTweet = (req, res) => {
  const sanitizedText = escapeHtml(req.body.text);
  const username = req.user.username;
  const timestamp = new Date().toISOString();

  const encryptedText = encrypt(sanitizedText);
  console.log("Verschlüsselter Text:", encryptedText);


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
