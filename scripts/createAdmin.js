
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('../src/config/database');
const { dbGet, dbRun } = require('../src/middlewares_helpers/sqlite3_helpers');

async function createAdmin() {
  try {
    const name = process.env.ADMIN_NAME?.trim();
    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;

    // Validasi konfigurasi akun
    if (!name || !username || !password) {
      throw new Error(
        'ADMIN_NAME, ADMIN_USERNAME, dan ADMIN_PASSWORD harus diisi di .env'
      );
    }

    if (password.length < 10) {
      throw new Error('Password admin minimal 10 karakter.');
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Password terlalu panjang untuk bcrypt.');
    }

    // Pastikan database sudah siap
    await initializeDatabase();

    // Periksa apakah username sudah digunakan
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      throw new Error('Username sudah digunakan.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Simpan akun admin
    const result = await dbRun(
      `INSERT INTO users (
        name,
        username,
        password_hash,
        role,
        is_active
      ) VALUES (?, ?, ?, 'admin', 1)`,
      [name, username, passwordHash]
    );

    console.log('✅ Akun Admin berhasil dibuat!');
    console.log('ID:', result.lastID);
    console.log('Nama:', name);
    console.log('Username:', username);
    console.log('Role: admin');
    console.log('Password tersimpan dalam bentuk hash.');

  } catch (error) {
    console.error('❌ Gagal membuat akun admin:', error.message);
    process.exitCode = 1;
  } finally {
    db.close((error) => {
      if (error) {
        console.error('Gagal menutup database:', error.message);
      }
    });
  }
}

createAdmin();
