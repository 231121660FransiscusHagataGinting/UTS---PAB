
const { dbRun, dbGet } = require('../middlewares_helpers/sqlite3_helpers');

// =========================================
// MENCARI USER BERDASARKAN USERNAME
// =========================================

const findUserByUsername = async (username) => {
  return await dbGet(
    `SELECT
        id,
        name,
        username,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
     FROM users
     WHERE username = ?`,
    [username]
  );
};

// =========================================
// MENCARI USER BERDASARKAN ID
// =========================================

const findUserById = async (id) => {
  return await dbGet(
    `SELECT
        id,
        name,
        username,
        role,
        is_active,
        created_at,
        updated_at
     FROM users
     WHERE id = ?`,
    [id]
  );
};

// =========================================
// MEMBUAT AKUN USER
// Password harus sudah di-hash sebelum masuk
// ke fungsi ini.
// =========================================

const createUser = async (user) => {
  const query = `
    INSERT INTO users (
      name,
      username,
      password_hash,
      role,
      is_active
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  const values = [
    user.name,
    user.username,
    user.password_hash,
    user.role || 'cashier',
    user.is_active ?? 1,
  ];

  const result = await dbRun(query, values);

  return await findUserById(result.lastID);
};

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
};
