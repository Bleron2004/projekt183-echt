const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const sanitizer = require("express-sanitizer");
const crypto = require("crypto");

// ✅ Fester Schlüssel für Verschlüsselung (32 Byte für AES-256)
const SECRET_KEY = "dein_geheimer_schlüssel";
const ENCRYPTION_KEY = Buffer.from("cda89a82b82fdbb2884b60780fcd7d490f7c39332fe90988ccb3a30b2fcdaee0", "hex");
const IV_LENGTH = 16;

let db;

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Zu viele fehlgeschlagene Login-Versuche. Bitte warte 15 Minuten.",
  headers: true,
});

const escapeHtml = (unsafe) => {
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
};

// ✅ Funktion zur sicheren Verschlüsselung
const encrypt = (text) => {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

// ✅ Funktion zur sicheren Entschlüsselung
const decrypt = (text) => {
  try {
    if (!text || !text.includes(":")) {
      console.warn("⚠️ Klartext erkannt, wird nicht entschlüsselt:", text);
      return text;
    }

    let textParts = text.split(":");
    if (textParts.length !== 2) throw new Error("Ungültiges Format!");

    let iv = Buffer.from(textParts[0], "hex");
    let encryptedText = Buffer.from(textParts[1], "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

    let decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("❌ Fehler beim Entschlüsseln:", err);
    return "Fehler beim Entschlüsseln";
  }
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

// ✅ Feed abrufen und fehlerhafte Entschlüsselung verhindern
const getFeed = async (req, res) => {
  const query = "SELECT username, timestamp, text FROM tweets ORDER BY id DESC";
  const tweets = await queryDB(db, query);

  const decryptedTweets = tweets.map((tweet) => {
    let decryptedText;

    try {
      decryptedText = tweet.text.includes(":") ? decrypt(tweet.text) : tweet.text;
    } catch (error) {
      decryptedText = "Fehler beim Entschlüsseln";
    }

    return { ...tweet, text: decryptedText };
  });

  res.json(decryptedTweets);
};

// ✅ Tweet posten und sicher speichern
const postTweet = (req, res) => {
  const sanitizedText = escapeHtml(req.body.text);
  const username = req.user.username;
  const timestamp = new Date().toISOString();

  const encryptedText = encrypt(sanitizedText);
  console.log(`🔒 Gespeicherter verschlüsselter Tweet von ${username}:`, encryptedText);

  const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, ?, ?)`;

  insertDB(db, query, [username, timestamp, encryptedText])
      .then(() => {
        res.json({ status: "Tweet gespeichert!", text: sanitizedText });
      })
      .catch((error) => {
        console.error("❌ Fehler beim Speichern des Tweets:", error);
        res.status(500).json({ message: "Fehler beim Speichern des Tweets" });
      });
};

// ✅ Login-Funktion
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
