// index.js

// Pokud chceš lokálně testovat, odkomentuj následující řádek a vytvoř .env soubor:
// require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const mysql      = require('mysql');

const app  = express();
const PORT = process.env.PORT || 3000;

// Na Railway se nastavují tyhle proměnné v Settings → Environment Variables
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE
} = process.env;

// Kontrola, že máme všechny klíče
if (!MYSQL_HOST || !MYSQL_PORT || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
  console.error('❌ Chybí některé MYSQL_* proměnné v prostředí!');
  process.exit(1);
}

console.log('▶ ENV CONFIG:', {
  host:     MYSQL_HOST,
  port:     MYSQL_PORT,
  user:     MYSQL_USER,
  database: MYSQL_DATABASE
});

// Vytvoření připojení na základu proměnných
const connection = mysql.createConnection({
  host:           MYSQL_HOST,
  port:           parseInt(MYSQL_PORT, 10),
  user:           MYSQL_USER,
  password:       MYSQL_PASSWORD,
  database:       MYSQL_DATABASE,
  connectTimeout: 20000
});

connection.connect(err => {
  if (err) {
    console.error('❌ Nepodařilo se připojit k DB:', err.stack);
    process.exit(1);
  }
  console.log('✅ Připojeno k DB, threadId =', connection.threadId);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Testovací routa
app.get('/', (req, res) => {
  res.json({ message: 'Server běží a DB je připojená!' });
});

// Příklad jednoduché DB query
app.get('/users', (req, res) => {
  connection.query('SELECT * FROM users LIMIT 10', (err, results) => {
    if (err) {
      console.error('❌ Chyba DB dotazu:', err);
      return res.status(500).json({ error: 'DB query error', details: err });
    }
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server naslouchá na portu ${PORT}`);
});
