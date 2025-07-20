// index.js

// Pokud testuješ lokálně, odkomentuj a vytvoř .env soubor:
// require('dotenv').config();

const express = require('express');
const mysql   = require('mysql');

const app  = express();
const PORT = process.env.PORT || 3000;

// Načteme proměnné prostředí
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE
} = process.env;

// Ověříme, že jsou nastavené
if (!MYSQL_HOST || !MYSQL_PORT || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
  console.error('❌ Chybí MYSQL_* proměnné!');
  process.exit(1);
}

console.log('▶ ENV CONFIG:', {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  database: MYSQL_DATABASE
});

// Připojení k databázi s ošetřením chyb
const connection = mysql.createConnection({
  host:     MYSQL_HOST,
  port:     parseInt(MYSQL_PORT, 10),
  user:     MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  connectTimeout: 20000
});

connection.connect(err => {
  if (err) {
    console.error('❌ Připojení k DB selhalo:', err.message);
    // Nespustíme aplikaci, pokud není DB dostupná
    process.exit(1);
  } else {
    console.log('✅ Připojeno k DB, threadId =', connection.threadId);
  }
});

// API endpointy
app.get('/', (req, res) => {
  res.json({ message: '✅ Server běží a DB je připojena.' });
});

app.get('/users', (req, res) => {
  connection.query('SELECT * FROM users LIMIT 10', (err, results) => {
    if (err) {
      console.error('❌ Chyba při dotazu:', err.message);
      return res.status(500).json({ error: 'Dotaz selhal', details: err.message });
    }
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server naslouchá na portu ${PORT}`);
});
