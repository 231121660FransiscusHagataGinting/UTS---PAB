
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const { dbPath } = require('../config/database');

// =========================================
// HELPER: MEMBUKA KONEKSI DATABASE KHUSUS
// =========================================

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(dbPath, (error) => {
      if (error) {
        reject(error);
        return;
      }

      connection.configure('busyTimeout', 5000);
      resolve(connection);
    });
  });

// =========================================
// HELPER: MENJALANKAN QUERY
// =========================================

const run = (db, query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (error) {
      if (error) reject(error);
      else {
        resolve({
          lastID: this.lastID,
          changes: this.changes,
        });
      }
    });
  });

const get = (db, query, params = []) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });

// =========================================
// HELPER: MENUTUP KONEKSI
// =========================================

const closeDatabase = (db) =>
  new Promise((resolve) => {
    db.close((error) => {
      if (error) {
        console.error('Gagal menutup koneksi transaksi:', error.message);
      }

      resolve();
    });
  });

// =========================================
// MEMBUAT TRANSAKSI PENJUALAN
// =========================================

const createTransaction = async (data, userId) => {
  const {
    customerName,
    customerPhone,
    paymentMethod,
    paidAmount,
    items,
  } = data;

  const db = await openDatabase();

  let transactionStarted = false;

  try {
    // 1. Aktifkan Foreign Key pada koneksi ini
    await run(db, 'PRAGMA foreign_keys = ON');

    const foreignKeyStatus = await get(
      db,
      'PRAGMA foreign_keys'
    );

    if (foreignKeyStatus.foreign_keys !== 1) {
      throw new Error('Foreign Key SQLite belum aktif.');
    }

    // 2. Mulai transaksi SQL
    await run(db, 'BEGIN IMMEDIATE');
    transactionStarted = true;

    // 3. Validasi metode pembayaran
    const allowedMethods = [
      'Tunai',
      'QRIS',
      'Transfer Bank',
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      throw new Error('Metode pembayaran tidak valid.');
    }

    // 4. Validasi daftar barang
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Transaksi harus memiliki minimal satu produk.');
    }

    // Gabungkan produk yang ID-nya sama
    const itemMap = new Map();

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('ID produk tidak valid.');
      }

      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new Error('Jumlah produk harus berupa bilangan bulat positif.');
      }

      itemMap.set(
        productId,
        (itemMap.get(productId) || 0) + quantity
      );
    }

    // 5. Periksa produk dan stok terbaru
    const transactionItems = [];
    let totalAmount = 0;

    for (const [productId, quantity] of itemMap) {
      const product = await get(
        db,
        `SELECT id, name, price, stock, is_available
         FROM products
         WHERE id = ?`,
        [productId]
      );

      if (!product) {
        throw new Error(`Produk dengan ID ${productId} tidak ditemukan.`);
      }

      if (Number(product.is_available) !== 1) {
        throw new Error(`Produk ${product.name} tidak tersedia.`);
      }

      const stock = Number(product.stock);
      const price = Number(product.price);

      if (!Number.isSafeInteger(stock) || stock < 0) {
        throw new Error(`Data stok ${product.name} tidak valid.`);
      }

      if (!Number.isSafeInteger(price) || price < 0) {
        throw new Error(`Harga ${product.name} harus berupa bilangan bulat.`);
      }

      if (stock < quantity) {
        throw new Error(
          `Stok ${product.name} tidak mencukupi. Stok tersedia: ${stock}.`
        );
      }

      const lineTotal = price * quantity;

      if (!Number.isSafeInteger(lineTotal)) {
        throw new Error(`Total harga ${product.name} terlalu besar.`);
      }

      totalAmount += lineTotal;

      if (!Number.isSafeInteger(totalAmount)) {
        throw new Error('Total transaksi terlalu besar.');
      }

      transactionItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: price,
        lineTotal,
      });
    }

    // 6. Tentukan pembayaran
    const actualPaid =
      paymentMethod === 'Tunai'
        ? Number(paidAmount)
        : totalAmount;

    if (
      !Number.isSafeInteger(actualPaid) ||
      actualPaid < totalAmount
    ) {
      throw new Error('Jumlah pembayaran tidak mencukupi.');
    }

    const changeAmount =
      paymentMethod === 'Tunai'
        ? actualPaid - totalAmount
        : 0;

    // 7. Simpan atau cari pelanggan
    const name =
      typeof customerName === 'string'
        ? customerName.trim()
        : '';

    const phone =
      typeof customerPhone === 'string'
        ? customerPhone.trim()
        : '';

    let customerId = null;

    if (name || phone) {
      let existingCustomer = null;

      // Cari pelanggan berdasarkan nomor telepon
      // agar tidak membuat data pelanggan duplikat.
      if (phone) {
        existingCustomer = await get(
          db,
          `SELECT id
           FROM customers
           WHERE phone = ?
           ORDER BY id DESC
           LIMIT 1`,
          [phone]
        );
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const customerResult = await run(
          db,
          `INSERT INTO customers (name, phone)
           VALUES (?, ?)`,
          [name || 'Pelanggan umum', phone || null]
        );

        customerId = customerResult.lastID;
      }
    }

    // 8. Buat nomor invoice unik
    const invoiceNumber =
      `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 9. Simpan transaksi utama
    const transactionResult = await run(
      db,
      `INSERT INTO transactions (
        invoice_number,
        customer_id,
        user_id,
        total_amount,
        payment_method,
        paid_amount,
        change_amount,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        invoiceNumber,
        customerId,
        userId,
        totalAmount,
        paymentMethod,
        actualPaid,
        changeAmount,
      ]
    );

    const transactionId = transactionResult.lastID;

    // 10. Simpan rincian barang dan kurangi stok
    for (const item of transactionItems) {
      const stockUpdate = await run(
        db,
        `UPDATE products
         SET
           stock = stock - ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND stock >= ?`,
        [
          item.quantity,
          item.productId,
          item.quantity,
        ]
      );

      if (stockUpdate.changes !== 1) {
        throw new Error(
          `Gagal mengurangi stok ${item.productName}.`
        );
      }

      await run(
        db,
        `INSERT INTO transaction_items (
          transaction_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          line_total
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
        ]
      );
    }

    // 11. Commit seluruh perubahan
    await run(db, 'COMMIT');
    transactionStarted = false;

    // 12. Kembalikan hasil transaksi
    const createdTransaction = await get(
      db,
      `SELECT
        id,
        invoice_number,
        customer_id,
        user_id,
        transaction_date,
        total_amount,
        payment_method,
        paid_amount,
        change_amount,
        status
       FROM transactions
       WHERE id = ?`,
      [transactionId]
    );

    return {
      ...createdTransaction,
      customer: name || 'Pelanggan umum',
      phone,
      items: transactionItems,
    };

  } catch (error) {
    // Jika ada satu proses gagal, batalkan semuanya.
    if (transactionStarted) {
      try {
        await run(db, 'ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Rollback gagal:',
          rollbackError.message
        );
      }
    }

    throw error;

  } finally {
    await closeDatabase(db);
  }
};

module.exports = {
  createTransaction,
};
