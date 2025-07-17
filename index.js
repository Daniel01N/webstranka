// index.js

// Pro lokální vývoj odkomentuj následující řádek 
// a vytvoř ve složce projektu soubor .env podle .env.example níže
// require('dotenv').config();

const express = require('express');
const mysql   = require('mysql');

const app  = express();
const PORT = process.env.PORT || 3000;

// Extrahujeme proměnné z prostředí (Railway / .env)
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE
} = process.env;

// Kontrola, že máme opravdu všech pět proměnných
if (
  !MYSQL_HOST  ||
  !MYSQL_PORT  ||
  !MYSQL_USER  ||
  !MYSQL_PASSWORD ||
  !MYSQL_DATABASE
) {
  console.error('❌ Chybí MYSQL_* proměnné v prostředí!');
  process.exit(1);
}

// Ukážeme si, jaké hodnoty jsme načetli
console.log('▶ ENV CONFIG:', {
  host:     MYSQL_HOST,
  port:     MYSQL_PORT,
  user:     MYSQL_USER,
  database: MYSQL_DATABASE
});

// Vytvoříme připojení k MySQL podle proměnných
const connection = mysql.createConnection({
  host:           MYSQL_HOST,
  port:           parseInt(MYSQL_PORT,  10),
  user:           MYSQL_USER,
  password:       MYSQL_PASSWORD,
  database:       MYSQL_DATABASE,
  connectTimeout: 20000
});

connection.connect(err => {
  if (err) {
    console.error('❌ Připojení k DB selhalo:', err.stack);
    process.exit(1);
  }
  console.log('✅ Připojeno k DB, threadId =', connection.threadId);
});

// Jednoduché JSON endpointy
app.get('/', (req, res) => {
  res.json({ message: 'Server běží a DB je připojena.' });
});

app.get('/users', (req, res) => {
  connection.query('SELECT * FROM users LIMIT 10', (err, results) => {
    if (err) {
      console.error('❌ Chyba při dotazu:', err);
      return res.status(500).json({ error: 'DB query error', details: err });
    }
    res.json(results);
  });
});

// Spuštění serveru  
app.listen(PORT, () => {
  console.log(`🚀 Server naslouchá na portu ${PORT}`);
});
