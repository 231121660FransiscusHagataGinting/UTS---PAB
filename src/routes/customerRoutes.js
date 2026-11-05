
const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');

const {
  authenticateToken,
} = require('../middlewares/authMiddleware');

// =========================================
// SEMUA ROUTE PELANGGAN WAJIB LOGIN
// =========================================

router.use(authenticateToken);

// GET: Mengambil semua pelanggan
router.get('/', customerController.getAllCustomers);

// GET: Mengambil pelanggan berdasarkan ID
router.get('/:id', customerController.getCustomerById);

// POST: Menambahkan pelanggan
router.post('/', customerController.createCustomer);

// PUT: Memperbarui pelanggan
router.put('/:id', customerController.updateCustomer);

// DELETE: Menghapus pelanggan
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
