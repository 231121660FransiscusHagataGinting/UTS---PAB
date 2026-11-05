
import axiosClient from '../api/axiosClient'

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer Bank'

// =========================================
// TIPE DATA PEMBUATAN TRANSAKSI
// =========================================

export interface CreateTransactionRequest {
  customerName: string
  customerPhone: string
  paymentMethod: PaymentMethod
  paidAmount: number
  items: {
    productId: number
    quantity: number
  }[]
}

// =========================================
// RESPONSE POST TRANSAKSI
// =========================================

export interface TransactionResult {
  id: number
  invoice_number: string
  customer_id: number | null
  user_id: number
  transaction_date: string
  total_amount: number
  payment_method: PaymentMethod
  paid_amount: number
  change_amount: number
  status: string
  customer: string
  phone: string
  items: {
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
}

// =========================================
// RESPONSE GET RIWAYAT TRANSAKSI
// =========================================

export interface TransactionHistoryItem {
  databaseId: number
  id: string
  invoiceNumber: string
  customerId: number | null
  customer: string
  phone: string
  userId: number
  cashierName: string
  cashierUsername: string
  date: string | null
  paymentMethod: PaymentMethod
  total: number
  amountPaid: number
  change: number
  status: string
  items: {
    itemId: number
    productId: number | null
    productName: string
    quantity: number
    price: number
    lineTotal: number
  }[]
}

// =========================================
// RESPONSE API
// =========================================

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// =========================================
// POST: MEMBUAT TRANSAKSI
// =========================================

export async function createTransaction(
  transaction: CreateTransactionRequest
): Promise<TransactionResult> {
  const response = await axiosClient.post<
    ApiResponse<TransactionResult>
  >('/transactions', transaction)

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || 'Gagal menyimpan transaksi.'
    )
  }

  return response.data.data
}

// =========================================
// GET: MENGAMBIL RIWAYAT TRANSAKSI
// =========================================

export async function getTransactions(): Promise<TransactionHistoryItem[]> {
  const response = await axiosClient.get<
    ApiResponse<TransactionHistoryItem[]>
  >('/transactions')

  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error(
      response.data.message || 'Gagal mengambil riwayat transaksi.'
    )
  }

  return response.data.data
}
