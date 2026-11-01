
import axiosClient from '../api/axiosClient'
import type {
  Product,
  ProductsResponse,
  ProductSingleResponse,
  ProductDeleteResponse,
} from '../types'

// GET: Mengambil semua produk
export async function getProducts(): Promise<Product[]> {
  const response = await axiosClient.get<ProductsResponse>('/products')

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal mengambil produk')
  }

  return response.data.data
}

// POST: Menambahkan produk
export async function createProduct(
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<Product> {
  const response = await axiosClient.post<ProductSingleResponse>(
    '/products',
    product
  )

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal menambahkan produk')
  }

  return response.data.data
}

// PUT: Mengedit produk
export async function updateProduct(
  id: number,
  product: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
): Promise<Product> {
  const response = await axiosClient.put<ProductSingleResponse>(
    `/products/${id}`,
    product
  )

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal mengedit produk')
  }

  return response.data.data
}

// DELETE: Menghapus produk
export async function deleteProduct(id: number): Promise<void> {
  const response = await axiosClient.delete<ProductDeleteResponse>(
    `/products/${id}`
  )

  if (!response.data.success) {
    throw new Error(response.data.message || 'Gagal menghapus produk')
  }
}
