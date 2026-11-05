
const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');

const {
  authenticateToken,
} = require('../middlewares/authMiddleware');

// =========================================
// SEMUA ROUTE PRODUK WAJIB LOGIN
// =========================================

router.use(authenticateToken);

// GET: Mengambil semua produk
router.get('/', productController.getAllProducts);

// GET: Mengambil satu produk
router.get('/:id', productController.getProductById);

// POST: Menambahkan produk
router.post('/', productController.createProduct);

// PUT: Mengedit produk
router.put('/:id', productController.updateProduct);

// DELETE: Menghapus produk
router.delete('/:id', productController.deleteProduct);

// Test purpose: Menambahkan banyak produk
router.post('/bulk', productController.bulkCreateProducts);

module.exports = router;
