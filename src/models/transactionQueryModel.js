
const { dbAll } = require('../middlewares_helpers/sqlite3_helpers');

// =========================================
// GET: MENGAMBIL SEMUA TRANSAKSI
// BESERTA DETAIL PRODUK DAN PELANGGAN
// =========================================

const findAllTransactions = async () => {
  const query = `
    SELECT
      t.id AS transaction_id,
      t.invoice_number,
      t.customer_id,
      t.user_id,
      t.transaction_date,
      t.total_amount,
      t.payment_method,
      t.paid_amount,
      t.change_amount,
      t.status,

      c.name AS customer_name,
      c.phone AS customer_phone,

      u.name AS cashier_name,
      u.username AS cashier_username,

      ti.id AS item_id,
      ti.product_id AS item_product_id,
      ti.product_name AS item_product_name,
      ti.quantity AS item_quantity,
      ti.unit_price AS item_unit_price,
      ti.line_total AS item_line_total

    FROM transactions t

    LEFT JOIN customers c
      ON t.customer_id = c.id

    LEFT JOIN users u
      ON t.user_id = u.id

    LEFT JOIN transaction_items ti
      ON t.id = ti.transaction_id

    ORDER BY
      t.transaction_date DESC,
      t.id DESC,
      ti.id ASC
  `;

  const rows = await dbAll(query);

  const transactionMap = new Map();

  for (const row of rows) {
    // Buat transaksi utama jika belum tersedia
    if (!transactionMap.has(row.transaction_id)) {
      transactionMap.set(row.transaction_id, {
        databaseId: row.transaction_id,
        id: row.invoice_number,
        invoiceNumber: row.invoice_number,

        customerId: row.customer_id,
        customer: row.customer_name || 'Pelanggan umum',
        phone: row.customer_phone || '',

        userId: row.user_id,
        cashierName: row.cashier_name || 'Tidak diketahui',
        cashierUsername: row.cashier_username || '',

        date: row.transaction_date
          ? `${row.transaction_date.replace(' ', 'T')}Z`
          : null,

        paymentMethod: row.payment_method,
        total: Number(row.total_amount),
        amountPaid: Number(row.paid_amount),
        change: Number(row.change_amount),
        status: row.status,

        items: [],
      });
    }

    const transaction = transactionMap.get(
      row.transaction_id
    );

    // Masukkan detail produk
    if (row.item_id !== null) {
      transaction.items.push({
        itemId: row.item_id,
        productId: row.item_product_id,
        productName: row.item_product_name,
        quantity: Number(row.item_quantity),
        price: Number(row.item_unit_price),
        lineTotal: Number(row.item_line_total),
      });
    }
  }

  return Array.from(transactionMap.values());
};

// =========================================
// EXPORT
// =========================================

module.exports = {
  findAllTransactions,
};
