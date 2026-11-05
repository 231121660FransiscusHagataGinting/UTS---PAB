
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { initializeDatabase } = require('./src/config/database');

const testRoutes = require('./src/routes/test');
const productRoutes = require('./src/routes/productRoutes');
const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================
// MIDDLEWARE
// =========================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================
// ROOT ROUTE
// =========================================

app.get('/', (req, res) => {
  res.json({
    message: 'Medan iStore API is running',
    endpoints: {
      'POST /api/auth/login': 'Login admin dan kasir',

      'GET /api/products': 'Ambil semua produk',
      'GET /api/products/:id': 'Ambil produk berdasarkan ID',
      'POST /api/products': 'Buat produk baru',
      'PUT /api/products/:id': 'Update produk',
      'DELETE /api/products/:id': 'Hapus produk',

      'GET /api/customers': 'Ambil semua pelanggan',
      'GET /api/customers/:id': 'Ambil pelanggan berdasarkan ID',
      'POST /api/customers': 'Tambah pelanggan',
      'PUT /api/customers/:id': 'Update pelanggan',
      'DELETE /api/customers/:id': 'Hapus pelanggan',
      'POST /api/transactions': 'Membuat transaksi penjualan',
    },
  });
});

// =========================================
// ROUTES
// =========================================

app.use('/api/test', testRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);

// =========================================
// 404
// =========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
  });
});

// =========================================
// START SERVER
// =========================================

(async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server gagal dijalankan:', error.message);
    process.exit(1);
  }
})();
