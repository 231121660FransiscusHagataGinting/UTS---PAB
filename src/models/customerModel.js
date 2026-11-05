
const {
  dbRun,
  dbGet,
  dbAll,
} = require('../middlewares_helpers/sqlite3_helpers');

// =========================================
// GET: MENCARI SEMUA PELANGGAN
// =========================================

const findAllCustomers = async () => {
  return await dbAll(
    'SELECT * FROM customers ORDER BY id DESC'
  );
};

// =========================================
// GET: MENCARI PELANGGAN BERDASARKAN ID
// =========================================

const findCustomerById = async (id) => {
  return await dbGet(
    'SELECT * FROM customers WHERE id = ?',
    [id]
  );
};

// =========================================
// POST: MENAMBAHKAN PELANGGAN
// =========================================

const createCustomer = async (body) => {
  const query = `
    INSERT INTO customers (name, phone)
    VALUES (?, ?)
  `;

  const values = [
    body.name.trim(),
    body.phone?.trim() || null,
  ];

  const result = await dbRun(query, values);

  return await findCustomerById(result.lastID);
};

// =========================================
// PUT: MEMPERBARUI PELANGGAN
// =========================================

const updateCustomer = async (id, body) => {
  const existing = await findCustomerById(id);

  if (!existing) return null;

  const query = `
    UPDATE customers
    SET
      name = ?,
      phone = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const values = [
    body.name !== undefined ? body.name.trim() : existing.name,
    body.phone !== undefined
      ? (body.phone.trim() || null)
      : existing.phone,
    id,
  ];

  await dbRun(query, values);

  return await findCustomerById(id);
};

// =========================================
// DELETE: MENGHAPUS PELANGGAN
// =========================================

const deleteCustomer = async (id) => {
  const result = await dbRun(
    'DELETE FROM customers WHERE id = ?',
    [id]
  );

  return result.changes > 0;
};

module.exports = {
  findAllCustomers,
  findCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
