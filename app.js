// 1) Načtení .env pro lokální testy (Railway to ignoruje)
require('dotenv').config();

const express = require('express');
const path    = require('path');
const mysql   = require('mysql');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));

// → Debug výpis načtených ENV (volitelné, pomůže ověřit nastavení)
console.log('🔧 ENV CONFIG:', {
  MYSQL_HOST:     process.env.MYSQL_HOST,
  MYSQL_PORT:     process.env.MYSQL_PORT,
  MYSQL_USER:     process.env.MYSQL_USER,
  MYSQL_DATABASE: process.env.MYSQL_DATABASE,
  PORT:           process.env.PORT
});

// 2) Připojení k MySQL výhradně přes ENV proměnné
const db = mysql.createConnection({
  host:     process.env.MYSQL_HOST,
  port:     process.env.MYSQL_PORT || 3306,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

db.connect(err => {
  if (err) {
    console.error('❌ Chyba DB:', err);
    process.exit(1);
  }
  console.log(
    '✅ Připojeno k DB na',
    `${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}`
  );
});

/* ===== API: MATERIALY ===== */
app.get('/api/materialy', (req, res) => {
  db.query('SELECT * FROM materialy', (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

app.post('/pridat-material', (req, res) => {
  const { nazev, cena, jednotka } = req.body;
  db.query(
    'INSERT INTO materialy (nazev, cena_za_jednotku, jednotka) VALUES (?, ?, ?)',
    [nazev, cena, jednotka],
    err => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.redirect('/materialy.html');
    }
  );
});

app.post('/smazat-material', (req, res) => {
  const { id } = req.body;
  db.query('DELETE FROM materialy WHERE id = ?', [id], err => {
    if (err) return res.status(500).send(err.sqlMessage);
    res.redirect('/materialy.html');
  });
});

/* ===== API: SKLAD ===== */
app.get('/api/sklad', (req, res) => {
  const sql = `
    SELECT s.id, m.nazev, s.mnozstvi,
           m.cena_za_jednotku, m.jednotka, s.celkova_cena
    FROM sklad s
    JOIN materialy m ON s.material_id = m.id
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

app.post('/pridat-do-skladu', (req, res) => {
  const { material_id, mnozstvi } = req.body;
  db.query(
    'SELECT cena_za_jednotku FROM materialy WHERE id = ?',
    [material_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      const cenaJednotkova = result[0].cena_za_jednotku;
      const celkovaCena   = cenaJednotkova * parseFloat(mnozstvi);
      db.query(
        'INSERT INTO sklad (material_id, mnozstvi, celkova_cena) VALUES (?, ?, ?)',
        [material_id, mnozstvi, celkovaCena],
        err2 => {
          if (err2) return res.status(500).send(err2.sqlMessage);
          res.redirect('/sklad.html');
        }
      );
    }
  );
});

app.post('/smazat-ze-skladu', (req, res) => {
  const { id } = req.body;
  db.query('DELETE FROM sklad WHERE id = ?', [id], err => {
    if (err) return res.status(500).send(err.sqlMessage);
    res.redirect('/sklad.html');
  });
});

/* ===== API: ZÁKAZNÍCI ===== */
app.get('/api/zakaznici', (req, res) => {
  db.query('SELECT * FROM zakaznici', (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

app.post('/pridat-zakaznika', (req, res) => {
  const { jmeno, email, telefon, adresa } = req.body;
  db.query(
    'INSERT INTO zakaznici (jmeno, email, telefon, adresa) VALUES (?, ?, ?, ?)',
    [jmeno, email, telefon, adresa],
    err => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.redirect('/zakaznici.html');
    }
  );
});

app.post('/smazat-zakaznika', (req, res) => {
  const { id } = req.body;
  db.query('DELETE FROM zakaznici WHERE id = ?', [id], err => {
    if (err) return res.status(500).send(err.sqlMessage);
    res.redirect('/zakaznici.html');
  });
});

/* ===== API: ZAKÁZKY ===== */
app.get('/api/zakazky', (req, res) => {
  const sql = `
    SELECT z.id, z.datum, z.celkova_cena, k.jmeno,
      GROUP_CONCAT(
        CONCAT(m.nazev, ' (', zm.mnozstvi, '×', m.cena_za_jednotku, ' Kč)')
        SEPARATOR ', '
      ) AS materialy
    FROM zakazky z
    JOIN zakaznici k ON z.zakaznik_id = k.id
    LEFT JOIN zakazka_materialy zm ON z.id = zm.zakazka_id
    LEFT JOIN materialy m ON zm.material_id = m.id
    GROUP BY z.id
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

app.post('/pridat-zakazku', (req, res) => {
  let { zakaznik_id, datum, celkova_cena, material_id, mnozstvi } =
    req.body;
  if (material_id && !Array.isArray(material_id)) {
    material_id = [material_id];
    mnozstvi    = [mnozstvi];
  }
  db.query(
    'INSERT INTO zakazky (zakaznik_id, datum, celkova_cena) VALUES (?, ?, ?)',
    [zakaznik_id, datum, celkova_cena],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      const zakId = result.insertId;
      db.query(
        'SELECT id, cena_za_jednotku FROM materialy WHERE id IN (?)',
        [material_id],
        (err2, ceny) => {
          if (err2) return res.status(500).send(err2.sqlMessage);
          const map = {};
          ceny.forEach(m => (map[m.id] = m.cena_za_jednotku));
          const values = material_id.map((mid, i) => [
            zakId,
            mid,
            parseFloat(mnozstvi[i]),
            map[mid] * parseFloat(mnozstvi[i])
          ]);
          db.query(
            'INSERT INTO zakazka_materialy (zakazka_id, material_id, mnozstvi, cena) VALUES ?',
            [values],
            err3 => {
              if (err3) return res.status(500).send(err3.sqlMessage);
              res.redirect('/zakazky.html');
            }
          );
        }
      );
    }
  );
});

app.post('/smazat-zakazku', (req, res) => {
  const { id } = req.body;
  db.query('DELETE FROM zakazky WHERE id = ?', [id], err => {
    if (err) return res.status(500).send(err.sqlMessage);
    db.query(
      'DELETE FROM zakazka_materialy WHERE zakazka_id = ?',
      [id],
      () => res.redirect('/zakazky.html')
    );
  });
});

// 3) Jediná deklarace PORT a spuštění serveru
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server běží na portu ${PORT}`);
});
