
const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');

const {
  authenticateToken,
} = require('../middlewares/authMiddleware');

// Semua endpoint transaksi wajib login
router.use(authenticateToken);

// GET: Mengambil seluruh riwayat transaksi
router.get('/', transactionController.getAllTransactions);

// POST: Membuat transaksi penjualan
router.post('/', transactionController.createTransaction);

module.exports = router;
