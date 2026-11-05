
const transactionModel = require('../models/transactionModel');
const transactionQueryModel = require('../models/transactionQueryModel');

// =========================================
// HELPER RESPONSE
// =========================================

const success = (res, code, message, data = null) => {
  return res.status(code).json({
    success: true,
    message,
    data,
  });
};

const fail = (res, code, message, error = null) => {
  return res.status(code).json({
    success: false,
    message,
    error,
  });
};

// =========================================
// POST /api/transactions
// MEMBUAT TRANSAKSI PENJUALAN
// =========================================

const createTransaction = async (req, res) => {
  try {
    // 1. Pastikan pengguna sudah login
    if (!req.user || !req.user.id) {
      return fail(
        res,
        401,
        'Pengguna belum terautentikasi.'
      );
    }

    // 2. Ambil data dari frontend
    const {
      customerName,
      customerPhone,
      paymentMethod,
      paidAmount,
      items,
    } = req.body;

    // 3. Validasi nama pelanggan
    if (
      customerName !== undefined &&
      customerName !== null &&
      typeof customerName !== 'string'
    ) {
      return fail(
        res,
        400,
        'Nama pelanggan harus berupa teks.'
      );
    }

    // 4. Validasi nomor telepon
    if (
      customerPhone !== undefined &&
      customerPhone !== null &&
      typeof customerPhone !== 'string'
    ) {
      return fail(
        res,
        400,
        'Nomor telepon harus berupa teks.'
      );
    }

    // 5. Validasi metode pembayaran
    const allowedMethods = [
      'Tunai',
      'QRIS',
      'Transfer Bank',
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      return fail(
        res,
        400,
        'Metode pembayaran tidak valid.'
      );
    }

    // 6. Validasi pembayaran tunai
    if (
      paymentMethod === 'Tunai' &&
      (
        typeof paidAmount !== 'number' ||
        !Number.isSafeInteger(paidAmount) ||
        paidAmount < 0
      )
    ) {
      return fail(
        res,
        400,
        'Jumlah pembayaran tunai harus berupa angka bulat yang valid.'
      );
    }

    // 7. Validasi daftar produk
    if (!Array.isArray(items) || items.length === 0) {
      return fail(
        res,
        400,
        'Transaksi harus memiliki minimal satu produk.'
      );
    }

    // 8. Panggil transactionModel
    // ID pengguna berasal dari JWT, bukan dari frontend.
    const transaction = await transactionModel.createTransaction(
      {
        customerName: customerName ?? '',
        customerPhone: customerPhone ?? '',
        paymentMethod,
        paidAmount,
        items,
      },
      req.user.id
    );

    // 9. Berikan respons berhasil
    return success(
      res,
      201,
      'Transaksi berhasil disimpan.',
      transaction
    );

  } catch (error) {
    console.error('[createTransaction]', error);

    // Kesalahan database atau sistem tidak ditampilkan
    // secara mentah kepada frontend.
    if (error.code && error.code.startsWith('SQLITE_')) {
      return fail(
        res,
        500,
        'Terjadi kesalahan database saat menyimpan transaksi.'
      );
    }

    // Kesalahan validasi dari model
    return fail(
      res,
      400,
      error.message || 'Transaksi gagal diproses.'
    );
  }
};


// =========================================
// GET /api/transactions
// MENGAMBIL SELURUH RIWAYAT TRANSAKSI
// =========================================

const getAllTransactions = async (req, res) => {
  try {
    const transactions =
      await transactionQueryModel.findAllTransactions();

    return res.status(200).json({
      success: true,
      message: 'Berhasil mengambil riwayat transaksi.',
      data: transactions,
    });

  } catch (error) {
    console.error('[getAllTransactions]', error);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat transaksi.',
    });
  }
};


// =========================================
// EXPORT
// =========================================

module.exports = {
  createTransaction,
  getAllTransactions,
};
