
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// =========================================
// KONFIGURASI LOKASI DATABASE
// =========================================

const dbPath = path.resolve(
  process.cwd(),
  process.env.DB_PATH || './database.sqlite'
);

// =========================================
// MEMBACA FILE INIT SQL
// =========================================

const initSQL = fs.readFileSync(
  path.join(__dirname, '../sql_scripts/init.sql'),
  'utf8'
);

// =========================================
// KONEKSI SQLITE
// =========================================

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Gagal konek SQLite:', err.message);
    process.exit(1);
  }

  console.log('✅ Terhubung ke SQLite:', dbPath);
});

// =========================================
// HELPER UNTUK MENJALANKAN SQL
// =========================================

const runQuery = (sql) =>
  new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const executeSQL = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

// =========================================
// INISIALISASI DATABASE
// =========================================

const initializeDatabase = async () => {
  try {
    // Aktifkan Foreign Key pada koneksi backend
    await runQuery('PRAGMA foreign_keys = ON');

    // Jalankan struktur database
    await executeSQL(initSQL);

    // Periksa status Foreign Key
    const foreignKeyStatus = await new Promise((resolve, reject) => {
      db.get('PRAGMA foreign_keys', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (foreignKeyStatus.foreign_keys !== 1) {
      throw new Error('Foreign Key SQLite belum aktif');
    }

    console.log('✅ Foreign Key SQLite aktif');
    console.log('✅ Database berhasil diinisialisasi');
  } catch (error) {
    console.error('❌ Gagal inisialisasi database:', error.message);
    throw error;
  }
};

// =========================================
// EXPORT
// =========================================

module.exports = {
  db,
  dbPath,
  initializeDatabase,
};
