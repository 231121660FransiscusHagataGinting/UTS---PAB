
import axiosClient from '../api/axiosClient'

// =========================================
// TIPE DATA PELANGGAN
// =========================================

export interface Customer {
  id: number
  name: string
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CustomerInput {
  name: string
  phone: string
}

interface CustomerResponse {
  success: boolean
  message: string
  data: Customer
}

interface CustomersResponse {
  success: boolean
  message: string
  data: Customer[]
}

// =========================================
// GET: MENGAMBIL SEMUA PELANGGAN
// =========================================

export async function getCustomers(): Promise<Customer[]> {
  const response = await axiosClient.get<CustomersResponse>(
    '/customers'
  )

  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error(
      response.data.message || 'Gagal mengambil data pelanggan.'
    )
  }

  return response.data.data
}

// =========================================
// POST: MENAMBAHKAN PELANGGAN
// =========================================

export async function createCustomer(
  customer: CustomerInput
): Promise<Customer> {
  const response = await axiosClient.post<CustomerResponse>(
    '/customers',
    customer
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || 'Gagal menambahkan pelanggan.'
    )
  }

  return response.data.data
}

// =========================================
// PUT: MEMPERBARUI PELANGGAN
// =========================================

export async function updateCustomer(
  id: number,
  customer: Partial<CustomerInput>
): Promise<Customer> {
  const response = await axiosClient.put<CustomerResponse>(
    `/customers/${id}`,
    customer
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || 'Gagal memperbarui pelanggan.'
    )
  }

  return response.data.data
}

// =========================================
// DELETE: MENGHAPUS PELANGGAN
// =========================================

export async function deleteCustomer(id: number): Promise<void> {
  const response = await axiosClient.delete<CustomerResponse>(
    `/customers/${id}`
  )

  if (!response.data.success) {
    throw new Error(
      response.data.message || 'Gagal menghapus pelanggan.'
    )
  }
}
