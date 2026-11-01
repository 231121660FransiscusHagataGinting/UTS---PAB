
export type ProductStatus = 'available' | 'out_of_stock'

export interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
  description: string
  is_available: number
  created_at: string
  updated_at: string
}

// Response untuk mengambil banyak produk
export interface ProductsResponse {
  success: boolean
  message: string
  data: Product[]
}

// Response untuk satu produk
export interface ProductSingleResponse {
  success: boolean
  message: string
  data: Product
}

// Response untuk menghapus produk
export interface ProductDeleteResponse {
  success: boolean
  message: string
  data: null
}
