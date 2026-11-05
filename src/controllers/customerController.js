
const customerModel = require('../models/customerModel');

// =========================================
// HELPER RESPONSE
// =========================================

const success = (res, code, message, data = null) =>
  res.status(code).json({
    success: true,
    message,
    data,
  });

const fail = (res, code, message, error = null) =>
  res.status(code).json({
    success: false,
    message,
    error,
  });

// =========================================
// GET /api/customers
// MENGAMBIL SEMUA PELANGGAN
// =========================================

const getAllCustomers = async (req, res) => {
  try {
    const customers = await customerModel.findAllCustomers();

    return success(
      res,
      200,
      'Berhasil mengambil data pelanggan',
      customers
    );
  } catch (error) {
    console.error('[getAllCustomers]', error);
    return fail(res, 500, 'Gagal mengambil data pelanggan');
  }
};

// =========================================
// GET /api/customers/:id
// MENGAMBIL SATU PELANGGAN
// =========================================

const getCustomerById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 400, 'ID pelanggan tidak valid');
    }

    const customer = await customerModel.findCustomerById(id);

    if (!customer) {
      return fail(res, 404, 'Pelanggan tidak ditemukan');
    }

    return success(
      res,
      200,
      'Berhasil mengambil data pelanggan',
      customer
    );
  } catch (error) {
    console.error('[getCustomerById]', error);
    return fail(res, 500, 'Gagal mengambil data pelanggan');
  }
};

// =========================================
// POST /api/customers
// MENAMBAHKAN PELANGGAN
// =========================================

const createCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (typeof name !== 'string' || name.trim() === '') {
      return fail(res, 400, 'Nama pelanggan wajib diisi');
    }

    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      return fail(res, 400, 'Nomor telepon harus berupa teks');
    }

    const customer = await customerModel.createCustomer({
      name: name.trim(),
      phone: phone ?? '',
    });

    return success(
      res,
      201,
      'Pelanggan berhasil ditambahkan',
      customer
    );
  } catch (error) {
    console.error('[createCustomer]', error);
    return fail(res, 500, 'Gagal menambahkan pelanggan');
  }
};

// =========================================
// PUT /api/customers/:id
// MEMPERBARUI PELANGGAN
// =========================================

const updateCustomer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 400, 'ID pelanggan tidak valid');
    }

    if (name === undefined && phone === undefined) {
      return fail(res, 400, 'Tidak ada data yang diperbarui');
    }

    if (name !== undefined &&
        (typeof name !== 'string' || name.trim() === '')) {
      return fail(res, 400, 'Nama pelanggan tidak boleh kosong');
    }

    if (phone !== undefined &&
        phone !== null &&
        typeof phone !== 'string') {
      return fail(res, 400, 'Nomor telepon harus berupa teks');
    }

    if (phone === null) {
      req.body.phone = '';
    }

    const customer = await customerModel.updateCustomer(id, {
      name,
      phone: req.body.phone,
    });

    if (!customer) {
      return fail(res, 404, 'Pelanggan tidak ditemukan');
    }

    return success(
      res,
      200,
      'Pelanggan berhasil diperbarui',
      customer
    );
  } catch (error) {
    console.error('[updateCustomer]', error);
    return fail(res, 500, 'Gagal memperbarui pelanggan');
  }
};

// =========================================
// DELETE /api/customers/:id
// MENGHAPUS PELANGGAN
// =========================================

const deleteCustomer = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 400, 'ID pelanggan tidak valid');
    }

    const deleted = await customerModel.deleteCustomer(id);

    if (!deleted) {
      return fail(res, 404, 'Pelanggan tidak ditemukan');
    }

    return success(
      res,
      200,
      'Pelanggan berhasil dihapus'
    );
  } catch (error) {
    console.error('[deleteCustomer]', error);
    return fail(res, 500, 'Gagal menghapus pelanggan');
  }
};

// =========================================
// EXPORT
// =========================================

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
