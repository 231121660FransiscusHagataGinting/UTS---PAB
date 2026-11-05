import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getProducts,
  createProduct,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
} from './Services/api'
import {
  getCustomers,
  createCustomer as createCustomerApi,
} from './Services/customerApi'

import type { Customer } from './Services/customerApi'
import {
  createTransaction as createTransactionApi,
  getTransactions,
} from './Services/transactionApi'
import type { Product } from './types'
import LoginPage from './LoginPage'
import type { AuthUser } from './Services/authApi'

type Page = 'dashboard' | 'sales' | 'products' | 'customers' | 'transactions'
type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer Bank'

type CartItem = {
  product: Product
  quantity: number
}

type TransactionItem = {
  productId: number
  productName: string
  quantity: number
  price: number
}

type Transaction = {
  id: string
  customer: string
  phone: string
  date: string
  items: TransactionItem[]
  paymentMethod: PaymentMethod
  total: number
  amountPaid: number
  change: number
}


const AUTH_TOKEN_KEY = 'medan-istore-auth-token'
const AUTH_USER_KEY = 'medan-istore-auth-user'

function readStoredUser(): AuthUser | null {
  try {
    const saved = sessionStorage.getItem(AUTH_USER_KEY)
    return saved ? (JSON.parse(saved) as AuthUser) : null
  } catch {
    return null
  }
}

const menuItems: { id: Page; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '▦', label: 'Ringkasan' },
  { id: 'sales', icon: '＋', label: 'Penjualan' },
  { id: 'products', icon: '▣', label: 'Produk' },
  { id: 'customers', icon: '♙', label: 'Pelanggan' },
  { id: 'transactions', icon: '◷', label: 'Transaksi' },
]



function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem(AUTH_TOKEN_KEY))
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(readStoredUser)
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  // State data pelanggan
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerError, setCustomerError] = useState('')
  // State form tambah pelanggan
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerFormError, setCustomerFormError] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productError, setProductError] = useState('')
  const [apiOnline, setApiOnline] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [transactionSearch, setTransactionSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')

  const [cart, setCart] = useState<CartItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const [today, setToday] = useState(() =>
    new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  )

  const [todayKey, setTodayKey] = useState(() =>
    new Date().toDateString()
  )

  
  // =========================================
  // MENGAMBIL DATA PRODUK DARI BACKEND
  // =========================================

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    setProductError('')

    try {
      const data = await getProducts()
      setProducts(data)
      setApiOnline(true)
    } catch (error) {
      setApiOnline(false)
      setProductError(
        error instanceof Error
          ? error.message
          : 'Gagal menghubungkan ke server'
      )
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  // =========================================
  // MENGAMBIL RIWAYAT TRANSAKSI DARI SQLITE
  // =========================================

  const loadTransactions = useCallback(async () => {
    try {
      const data = await getTransactions()

      const formattedTransactions: Transaction[] = data.map(
        (transaction) => ({
          id: transaction.invoiceNumber,
          customer: transaction.customer,
          phone: transaction.phone,
          date: transaction.date ?? '',
          items: transaction.items.map((item) => ({
            productId: item.productId ?? 0,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
          paymentMethod: transaction.paymentMethod,
          total: transaction.total,
          amountPaid: transaction.amountPaid,
          change: transaction.change,
        })
      )

      setTransactions(formattedTransactions)

    } catch (error) {
      console.error(
        'Gagal mengambil riwayat transaksi dari SQLite:',
        error
      )
    }
  }, [])

  
  // =========================================
  // MENGAMBIL DATA PELANGGAN DARI SQLITE
  // =========================================

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    setCustomerError('')

    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      setCustomerError(
        error instanceof Error
          ? error.message
          : 'Gagal mengambil data pelanggan.'
      )
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  
async function handleSaveCustomer() {
  const name = newCustomerName.trim()
  const phone = newCustomerPhone.trim()

  if (!name) {
    setCustomerFormError('Nama pelanggan wajib diisi.')
    return
  }

  setSavingCustomer(true)
  setCustomerFormError('')

  try {
    await createCustomerApi({
      name,
      phone,
    })

    await loadCustomers()

    setNewCustomerName('')
    setNewCustomerPhone('')
    setShowAddCustomer(false)

    alert('Pelanggan berhasil ditambahkan.')
  } catch (error) {
    setCustomerFormError(
      error instanceof Error
        ? error.message
        : 'Gagal menambahkan pelanggan.'
    )
  } finally {
    setSavingCustomer(false)
  }
}


  // =========================================
  // MEMUAT DATA SETELAH LOGIN BERHASIL
  // =========================================

  useEffect(() => {
    if (!authToken || !currentUser) return

    void loadProducts()
    void loadTransactions()
    void loadCustomers()
  }, [
    authToken,
    currentUser,
    loadProducts,
    loadTransactions,
    loadCustomers,
  ])
  
  // Memperbarui tanggal setiap 60 detik.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date()

      setToday(
        now.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      )

      setTodayKey(now.toDateString())
    }, 60000)

    return () => window.clearInterval(interval)
  }, [])

  const availableProducts = useMemo(
    () => products.filter((product) => product.is_available === 1),
    [products]
  )

  const categories = useMemo(
    () => [
      'Semua',
      ...new Set(availableProducts.map((product) => product.category)),
    ],
    [availableProducts]
  )

  const filteredProducts = useMemo(() => {
    return availableProducts.filter((product) => {
      const matchesCategory =
        activeCategory === 'Semua' ||
        product.category === activeCategory

      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category ?? '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [availableProducts, activeCategory, searchTerm])

  const filteredInventory = useMemo(() => {
    return products.filter(
      (product) =>
        product.name
          .toLowerCase()
          .includes(inventorySearch.toLowerCase()) ||
        (product.category ?? '')
          .toLowerCase()
          .includes(inventorySearch.toLowerCase())
    )
  }, [products, inventorySearch])

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)

  const activeLabel =
    menuItems.find((item) => item.id === activePage)?.label ?? 'Penjualan'

  function addToCart(product: Product) {
    if (product.stock <= 0) return

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id
      )

      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          return currentCart
        }

        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentCart, { product, quantity: 1 }]
    })

    setCheckoutMessage('')
  }

  function updateCartQuantity(productId: number, change: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.product.id !== productId) return item

          const newQuantity = item.quantity + change

          if (newQuantity <= 0) return null
          if (newQuantity > item.product.stock) return item

          return { ...item, quantity: newQuantity }
        })
        .filter((item): item is CartItem => item !== null)
    )

    setCheckoutMessage('')
  }

  function clearCart() {
    setCart([])
    setCheckoutMessage('')
  }

  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  )

  const cartSubtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  )

  const cashPaid = Number(amountPaid || 0)
  const changeAmount = Math.max(0, cashPaid - cartSubtotal)

  const todayTransactions = transactions.filter(
    (transaction) => new Date(transaction.date).toDateString() === todayKey
  )

  const todaySales = todayTransactions.reduce(
    (total, transaction) => total + transaction.total,
    0
  )

  const totalSales = transactions.reduce(
    (total, transaction) => total + transaction.total,
    0
  )

  const averageTransaction =
    transactions.length > 0 ? totalSales / transactions.length : 0

  const lowStockProducts = products.filter(
    (product) => product.stock <= 5
  )

  const lowStockCount = lowStockProducts.length

  const inventoryValue = products.reduce(
    (total, product) => total + product.price * product.stock,
    0
  )

  const uniqueCustomers = [
    ...new Set(
      transactions
        .map((transaction) => transaction.customer)
        .filter((customer) => customer !== 'Pelanggan umum')
    ),
  ]

  const filteredTransactions = transactions.filter((transaction) => {
    const search = transactionSearch.toLowerCase()

    return (
      transaction.id.toLowerCase().includes(search) ||
      transaction.customer.toLowerCase().includes(search)
    )
  })

  const filteredCustomers = customers.filter((customer) =>
  customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
  (customer.phone ?? '').includes(customerSearch)
)

const customersWithTransactions = customers.filter((customer) =>
  transactions.some(
    (transaction) =>
      transaction.customer.trim().toLowerCase() ===
      customer.name.trim().toLowerCase()
  )
).length
  function handleLoginSuccess(token: string, user: AuthUser) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))

  setAuthToken(token)
  setCurrentUser(user)
  setActivePage('dashboard')
}

function handleLogout() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
  sessionStorage.removeItem(AUTH_USER_KEY)

  setAuthToken(null)
  setCurrentUser(null)
  setCart([])
  setSidebarOpen(false)
}
  function navigate(page: Page) {
    setActivePage(page)
    setSidebarOpen(false)
  }

  
async function completePurchase() {
  if (isCheckingOut) return

  if (cart.length === 0) {
    setCheckoutMessage('Keranjang masih kosong.')
    return
  }

  if (paymentMethod === 'Tunai' && cashPaid < cartSubtotal) {
    setCheckoutMessage('Jumlah uang yang dibayar masih kurang.')
    return
  }

  setIsCheckingOut(true)
  setCheckoutMessage('')

  try {
    // =========================================
    // 1. KIRIM TRANSAKSI KE BACKEND
    // =========================================

    const savedTransaction = await createTransactionApi({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      paidAmount:
        paymentMethod === 'Tunai'
          ? cashPaid
          : cartSubtotal,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    })

    // =========================================
    // 2. UBAH RESPONS BACKEND KE FORMAT FRONTEND
    // =========================================

    const newTransaction: Transaction = {
      id: savedTransaction.invoice_number,
      customer: savedTransaction.customer,
      phone: savedTransaction.phone,
      date: savedTransaction.transaction_date,
      items: savedTransaction.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      paymentMethod: savedTransaction.payment_method,
      total: savedTransaction.total_amount,
      amountPaid: savedTransaction.paid_amount,
      change: savedTransaction.change_amount,
    }

    // =========================================
    // 3. PERBARUI RIWAYAT TRANSAKSI FRONTEND
    // =========================================

    setTransactions((current) => [
      newTransaction,
      ...current,
    ])

    // =========================================
    // 4. KOSONGKAN KERANJANG
    // =========================================

    setCart([])
    setAmountPaid('')
    setCustomerName('')
    setCustomerPhone('')
    setPaymentMethod('Tunai')
    setCheckoutMessage('')
    setActivePage('transactions')

    alert(
      `Transaksi berhasil diselesaikan!\nNomor Invoice: ${savedTransaction.invoice_number}`
    )

    // =========================================
    // 5. PERBARUI STOK DARI DATABASE
    // =========================================

    try {
      const refreshedProducts = await getProducts()

      setProducts(refreshedProducts)
      setApiOnline(true)
      setProductError('')
    } catch (refreshError) {
      console.error(
        'Transaksi berhasil, tetapi katalog gagal diperbarui:',
        refreshError
      )

      setApiOnline(false)
      setProductError(
        'Transaksi berhasil disimpan, tetapi katalog gagal diperbarui.'
      )
    }

  } catch (error) {
    setCheckoutMessage(
      error instanceof Error
        ? error.message
        : 'Transaksi gagal diselesaikan.'
    )

    try {
      await loadProducts()
    } catch {
      // Tidak perlu tindakan tambahan.
    }

  } finally {
    setIsCheckingOut(false)
  }
}

  function handleCheckout() {
    if (cart.length === 0) {
      setCheckoutMessage('Silakan pilih produk terlebih dahulu.')
      return
    }

    if (paymentMethod === 'Tunai' && cashPaid < cartSubtotal) {
      setCheckoutMessage('Jumlah dibayar tidak boleh kurang dari total.')
      return
    }

    if (paymentMethod !== 'Tunai') {
      const confirmed = window.confirm(
        `Pastikan pembayaran melalui ${paymentMethod} sudah diterima. Selesaikan transaksi?`
      )

      if (!confirmed) return
    }

    void completePurchase()
  }

  function exportTransactions() {
    if (transactions.length === 0) {
      alert('Belum ada transaksi untuk diekspor.')
      return
    }

    const rows = [
      [
        'ID Transaksi',
        'Pelanggan',
        'Tanggal',
        'Produk',
        'Jumlah',
        'Metode Pembayaran',
        'Total',
      ],
    ]

    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        rows.push([
          transaction.id,
          transaction.customer,
          new Date(transaction.date).toLocaleString('id-ID'),
          item.productName,
          String(item.quantity),
          transaction.paymentMethod,
          String(transaction.total),
        ])
      })
    })

    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'riwayat-transaksi-medan-istore.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus produk ${product.name}?`
    )

    if (!confirmed) return

    try {
      await deleteProductApi(product.id)

      await loadProducts()
      alert('Produk berhasil dihapus.')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menghapus produk.'
      )
    }
  }
  if (!authToken || !currentUser) {
    return (
      <LoginPage onLoginSuccess={handleLoginSuccess} />
    )
  }
  return (
    <div className="app-shell min-h-screen">
      {/* SIDEBAR */}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-20 flex flex-col ${sidebarOpen ? 'open' : ''}`}
        id="sidebar"
      >
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault()
            navigate('sales')
          }}
        >
          
        <span
          className="brand-mark"
          aria-hidden="true"
          style={{
            width: '80px',
            height: '80px',
            flexShrink: 0,
          }}
        >
          <img
            src="/images/logo-medan-istore.png"
            alt=""
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </span>
          <span>
            <strong>Medan iStore</strong>
            <small>Point of sale</small>
          </span>
        </a>

        <div className="nav-label">MENU UTAMA</div>

        <nav className="side-nav" aria-label="Navigasi utama">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {activePage === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="api-status">
          <span
            className={`status-indicator ${
              loadingProducts ? '' : apiOnline ? 'online' : 'offline'
            }`}
            id="apiIndicator"
          />
          <span>
            <strong id="apiStatusText">
              {loadingProducts
                ? 'Menghubungkan API'
                : apiOnline
                  ? 'API Terhubung'
                  : 'API Terputus'}
            </strong>
            <small>Node.js · localhost:3000</small>
          </span>
        </div>

        <div className="sidebar-user">
          <span className="avatar avatar-blue">
            {currentUser?.name
              ?.split(' ')
              .map((word) => word[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>

          <span className="user-copy">
            <strong>{currentUser?.name ?? 'Pengguna'}</strong>
            <small>
              {currentUser?.role === 'admin'
                ? 'Administrator'
                : 'Kasir'}
            </small>
          </span>

          <button
            type="button"
            onClick={handleLogout}
            title="Keluar dari aplikasi"
            className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-area min-h-screen">
        <header className="topbar sticky top-0 z-10">
          <button
            className="mobile-menu icon-button"
            id="mobileMenu"
            aria-label="Buka navigasi"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>

          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-separator">/</span>
            <strong id="pageCrumb">{activeLabel}</strong>
          </div>

          <div className="topbar-right">
            <span className="today-label">{today}</span>
            <button className="icon-button notification-button" aria-label="Notifikasi">
              ♧<i />
            </button>
            <span className="avatar avatar-blue top-avatar">KS</span>
          </div>
        </header>

        <div className="content-wrap mx-auto w-full">
          {/* RINGKASAN */}
          {activePage === 'dashboard' && (
            <section className="page-view" id="page-dashboard">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">TOKO IPHONE</p>
                  <h1>Ringkasan</h1>
                  <p className="subheading">Pantau aktivitas penjualan tokomu hari ini.</p>
                </div>
                <button className="button button-primary" onClick={() => navigate('sales')}>
                  <span>＋</span> Transaksi baru
                </button>
              </div>

              <div className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top"><span>Penjualan hari ini</span><span className="stat-icon mint">↗</span></div>
                  <strong>{formatRupiah(todaySales)}</strong>
                  <small className="stat-note">Total dari transaksi selesai</small>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Transaksi hari ini</span><span className="stat-icon lavender">▤</span></div>
                  <strong>{todayTransactions.length}</strong>
                  <small className="stat-note">Pesanan berhasil dibayar</small>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Produk tersedia</span><span className="stat-icon peach">▣</span></div>
                  <strong>{availableProducts.length}</strong>
                  <small className="stat-note">Jenis produk di katalog</small>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Total pelanggan</span><span className="stat-icon sky">♙</span></div>
                  <strong>{uniqueCustomers.length}</strong>
                  <small className="stat-note">Pelanggan tersimpan</small>
                </article>
              </div>

              <div className="dashboard-grid">
                <article className="panel recent-panel">
                  <div className="panel-heading">
                    <div><h2>Transaksi terbaru</h2><p>Aktivitas penjualan terkini</p></div>
                    <button className="text-button" onClick={() => navigate('transactions')}>
                      Lihat semua <span>→</span>
                    </button>
                  </div>
                  <div id="recentTransactions">
                    {transactions.length === 0 ? (
                      <div className="table-empty">Belum ada transaksi.</div>
                    ) : (
                      transactions.slice(0, 5).map((transaction) => (
                        <div className="cart-row" key={transaction.id}>
                          <div className="cart-row-info">
                            <strong>{transaction.customer}</strong>
                            <small>{transaction.id}</small>
                          </div>
                          <strong>{formatRupiah(transaction.total)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="panel stock-panel">
                  <div className="panel-heading">
                    <div><h2>Stok menipis</h2><p>Produk dengan stok 5 atau kurang</p></div>
                  </div>
                  <div id="lowStockList">
                    {lowStockProducts.length === 0 ? (
                      <div className="table-empty">Tidak ada stok menipis.</div>
                    ) : (
                      lowStockProducts.map((product) => (
                        <div className="cart-row" key={product.id}>
                          <div className="cart-row-info">
                            <strong>{product.name}</strong>
                            <small>{product.category}</small>
                          </div>
                          <strong>{product.stock} unit</strong>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </div>
            </section>
          )}

          {/* PENJUALAN */}
          {activePage === 'sales' && (
            <section className="page-view" id="page-sales">
              <div className="page-heading sales-heading">
                <div>
                  <p className="eyebrow">KASIR</p>
                  <h1>Penjualan</h1>
                  <p className="subheading">Pilih iPhone, masukkan pelanggan, lalu selesaikan pembayaran.</p>
                </div>
                <div className="sales-meta">
                  <span className="live-badge"><i /> Kasir aktif</span>
                  <span>{today}</span>
                </div>
              </div>

              <div
                className="sales-layout"
                style={{
                  alignItems: 'start',
                  overflow: 'visible',
                  minWidth: 0,
                  height: 'auto',
                }}
              >
                <section className="catalog-section" style={{ minWidth: 0 }}>
                  <div className="catalog-toolbar">
                    <label className="search-box">
                      <span className="search-icon">⌕</span>
                      <input
                        id="productSearch"
                        type="search"
                        placeholder="Cari nama iPhone atau model..."
                        autoComplete="off"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                      <kbd>⌘ K</kbd>
                    </label>
                    <button className="button button-outline" onClick={() => navigate('products')}>
                      <span>＋</span> Produk
                    </button>
                  </div>

                  <div className="category-tabs" id="categoryTabs">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`category-tab ${activeCategory === category ? 'active' : ''}`}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="catalog-summary">
                    <span id="catalogCount">
                      {loadingProducts ? 'Memuat produk...' : `${filteredProducts.length} produk`}
                    </span>

                    <button
                      className="text-button"
                      id="refreshProducts"
                      type="button"
                      onClick={() => void loadProducts()}
                      disabled={loadingProducts}
                    >
                      ↻ <span>Perbarui</span>
                    </button>
                  </div>

                  {productError && (
                    <div className="empty-inline">
                      {productError}
                      <button className="text-button" type="button" onClick={() => void loadProducts()}>
                        Coba lagi
                      </button>
                    </div>
                  )}

                  <div
                    className="product-grid"
                    id="productGrid"
                    hidden={loadingProducts || !!productError || availableProducts.length === 0 || filteredProducts.length === 0}
                  >
                    {filteredProducts.map((product) => (
                      <article
                        className={`product-card ${product.stock <= 0 ? 'oos' : ''}`}
                        key={product.id}
                      >
                        <div className="phone-art">
                          <span className={`stock-chip ${product.stock <= 5 ? 'low' : ''}`}>
                            {product.stock <= 0 ? 'Stok habis' : `Stok ${product.stock}`}
                          </span>

                          
                        <img
                          className="product-image"
                          src={
                            (product.category ?? '').toLowerCase() === 'airpods'
                              ? '/images/AirPods.png'
                              : product.name.toLowerCase().includes('macbook')
                                ? '/images/MacBook.png'
                                : product.name.toLowerCase().includes('watch')
                                  ? '/images/Apple%20Watch.png'
                                  : '/images/iPhone.png'
                          }
                          alt={product.name}
                        />

                        </div>

                        <div className="product-info">
                          <div className="product-kicker">{product.category}</div>
                          <h3 className="product-name">{product.name}</h3>
                          <strong className="product-price">{formatRupiah(product.price)}</strong>

                          <div className="product-card-footer">
                            <span className="cell-subtitle">
                              {product.stock > 0 ? 'Tersedia' : 'Tidak tersedia'}
                            </span>
                            <span className="cell-subtitle">{product.stock} unit</span>
                          </div>

                          <button
                            type="button"
                            className="button button-primary add-to-cart"
                            disabled={product.stock <= 0}
                            onClick={() => addToCart(product)}
                          >
                            {product.stock <= 0 ? 'Stok habis' : '+ Tambah ke keranjang'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div
                    className="empty-state"
                    id="catalogEmpty"
                    hidden={loadingProducts || !!productError || availableProducts.length > 0}
                  >
                    <div className="empty-illustration">▣</div>
                    <h3>Belum ada produk</h3>
                    <p>Tambahkan produk iPhone ke API untuk mulai membuat transaksi.</p>
                    <button className="text-button" onClick={() => navigate('products')}>
                      Kelola produk
                    </button>
                  </div>

                  {!loadingProducts && !productError && availableProducts.length > 0 && filteredProducts.length === 0 && (
                    <div className="empty-inline">
                      Tidak ada produk yang cocok di pencarian.
                    </div>
                  )}
                </section>

                <aside
                  className="order-panel"
                  style={{
                    alignSelf: 'start',
                    minWidth: 0,
                    minHeight: 0,
                    height: 'auto',
                    maxHeight: 'none',
                    overflowY: 'visible',
                    position: 'relative',
                    top: 'auto',
                  }}
                >
                  <div className="order-header">
                    <div>
                      <h2>Pesanan</h2>
                      <p id="cartItemCount">{cartItemCount} item</p>
                    </div>

                    <button
                      className="clear-cart"
                      id="clearCart"
                      type="button"
                      onClick={clearCart}
                      disabled={cart.length === 0}
                    >
                      Kosongkan
                    </button>
                  </div>

                  <div className="order-customer">
                    <label htmlFor="customerSelect">Pelanggan</label>
                    <select id="customerSelect"
                    value={selectedCustomerId}
                      onChange={(event) => {
                        const customerId = event.target.value

                        setSelectedCustomerId(customerId)

                        const selectedCustomer = customers.find(
                          (customer) => String(customer.id) === customerId
                        )

                        if (selectedCustomer) {
                          setCustomerName(selectedCustomer.name)
                          setCustomerPhone(selectedCustomer.phone ?? '')
                        } else {
                          setCustomerName('')
                          setCustomerPhone('')
                        }
                      }}
                    >
                      <option value="">Pelanggan umum</option>

                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.phone ? ` — ${customer.phone}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="customer-fields">
                      <input
                        id="customerName"
                        type="text"
                        placeholder="Nama pelanggan (opsional)"
                        autoComplete="name"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                      />
                      <input
                        id="customerPhone"
                        type="tel"
                        placeholder="Nomor telepon (opsional)"
                        autoComplete="tel"
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(event.target.value)}
                      />
                    </div>

                    <label className="check-row">
                      <input type="checkbox" id="saveCustomer" />
                      <span>Simpan sebagai pelanggan</span>
                    </label>
                  </div>

                  <div className="cart-items" id="cartItems">
                    {cart.length === 0 ? (
                      <div className="cart-empty">
                        <span>＋</span>
                        <strong>Keranjang masih kosong</strong>
                        <small>Pilih produk dari katalog</small>
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div className="cart-row" key={item.product.id}>
                          <div className="cart-row-info">
                            <strong>{item.product.name}</strong>
                            <small>{formatRupiah(item.product.price)}</small>
                          </div>

                          <div className="cart-row-actions">
                            <button
                              type="button"
                              aria-label={`Kurangi ${item.product.name}`}
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                            >
                              −
                            </button>

                            <span>{item.quantity}</span>

                            <button
                              type="button"
                              aria-label={`Tambah ${item.product.name}`}
                              disabled={item.quantity >= item.product.stock}
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                            >
                              +
                            </button>
                          </div>

                          <strong className="cart-row-total">
                            {formatRupiah(item.product.price * item.quantity)}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="order-footer">
                    <div className="payment-field">
                      <label htmlFor="paymentMethod">Metode pembayaran</label>
                      <select
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(event) => {
                          setPaymentMethod(event.target.value as PaymentMethod)
                          setCheckoutMessage('')
                        }}
                      >
                        <option value="Tunai">Tunai</option>
                        <option value="QRIS">QRIS</option>
                        <option value="Transfer Bank">Transfer Bank</option>
                      </select>
                    </div>

                    {paymentMethod === 'Tunai' && (
                      <div className="payment-field">
                        <label htmlFor="amountPaid">Jumlah dibayar</label>
                        <div className="amount-input">
                          <span>Rp</span>
                          <input
                            id="amountPaid"
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="0"
                            value={amountPaid}
                            onChange={(event) => setAmountPaid(event.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'QRIS' && (
                      <div className="payment-field">
                        <label>Pembayaran QRIS</label>
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                          <img
                            src="/metode%20pembayaran/qris.png"
                            alt="QRIS Medan iStore"
                            style={{
                              width: '180px',
                              maxWidth: '100%',
                              height: 'auto',
                              margin: '0 auto',
                            }}
                          />
                          <small>Pastikan pembayaran QRIS sudah diterima.</small>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Transfer Bank' && (
                      <div className="payment-field">
                        <label>Transfer SeaBank</label>
                        <div className="payment-detail">
                          <p>Nomor rekening: <strong>901576133327</strong></p>
                          <p>Atas nama: <strong>Fransiscus Hagata Ginting</strong></p>
                          <small>Pastikan dana sudah masuk sebelum menyelesaikan transaksi.</small>
                        </div>
                      </div>
                    )}

                    <div className="totals">
                      <div>
                        <span>Subtotal</span>
                        <strong id="cartSubtotal">{formatRupiah(cartSubtotal)}</strong>
                      </div>
                      <div>
                        <span>Pajak</span>
                        <strong className="muted-total">Termasuk</strong>
                      </div>
                      <div className="total-line">
                        <span>Total</span>
                        <strong id="cartTotal">{formatRupiah(cartSubtotal)}</strong>
                      </div>
                      {paymentMethod === 'Tunai' && (
                        <div>
                          <span>Kembalian</span>
                          <strong id="cartChange">{formatRupiah(changeAmount)}</strong>
                        </div>
                      )}
                    </div>

                    {checkoutMessage && (
                      <div className="empty-inline" role="alert">
                        {checkoutMessage}
                      </div>
                    )}

                    <button
                      className="button button-primary checkout-button"
                      id="checkoutButton"
                      type="button"
                      disabled={cart.length === 0 || isCheckingOut}
                      onClick={handleCheckout}
                    >
                      <span>✓</span>
                      {isCheckingOut ? 'Memproses transaksi...' : 'Selesaikan transaksi'}
                    </button>

                    <p className="secure-note">
                      <span>▣</span> Stok diperbarui setelah transaksi berhasil
                    </p>
                  </div>
                </aside>
              </div>
            </section>
          )}

          {/* PRODUK */}
          {activePage === 'products' && (
            <section className="page-view" id="page-products">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">INVENTARIS</p>
                  <h1>Produk</h1>
                  <p className="subheading">Kelola katalog dan ketersediaan stok iPhone.</p>
                </div>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setEditingProduct(null)
                    setShowAddProduct(true)
                  }}
                >
                  <span>＋</span> Tambah produk
                </button>
              </div>

              <div className="stats-strip">
                <div>
                  <span className="strip-icon mint">▣</span>
                  <span>
                    <small>Total produk</small>
                    <strong>{products.length}</strong>
                  </span>
                </div>
                <div>
                  <span className="strip-icon peach">↘</span>
                  <span>
                    <small>Stok menipis</small>
                    <strong>{lowStockCount} produk</strong>
                  </span>
                </div>
                <div>
                  <span className="strip-icon sky">◉</span>
                  <span>
                    <small>Nilai persediaan</small>
                    <strong>{formatRupiah(inventoryValue)}</strong>
                  </span>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-toolbar">
                  <label className="search-box table-search">
                    <span className="search-icon">⌕</span>
                    <input
                      id="inventorySearch"
                      type="search"
                      placeholder="Cari produk..."
                      value={inventorySearch}
                      onChange={(event) => setInventorySearch(event.target.value)}
                    />
                  </label>
                  <span className="table-result">{filteredInventory.length} produk</span>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>PRODUK</th>
                        <th>KATEGORI</th>
                        <th>HARGA</th>
                        <th>STOK</th>
                        <th>STATUS</th>
                        <th className="align-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                          </td>
                          <td>{product.category}</td>
                          <td>{formatRupiah(product.price)}</td>
                          <td>{product.stock}</td>
                          <td>
                            {product.stock > 0 ? 'Tersedia' : 'Stok habis'}
                          </td>
                          <td className="align-right">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'nowrap' }}>
                              <button
                                type="button"
                                className="button button-outline"
                                onClick={() => {
                                  setEditingProduct(product)
                                  setShowAddProduct(true)
                                }}
                              >
                                ✎ Edit
                              </button>

                              <button
                                type="button"
                                className="button button-outline"
                                onClick={() => void deleteProduct(product)}
                              >
                                × Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredInventory.length === 0 && (
                  <div className="table-empty">
                    Belum ada produk yang cocok.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* MODAL DATA PRODUK */}
          {showAddProduct && (
            <div className="modal-backdrop" id="modalBackdrop">
              <section
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modalTitle"
              >
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">INVENTARIS</p>
                    <h2 id="modalTitle">
                      {editingProduct ? 'Edit produk' : 'Tambah produk'}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="icon-button modal-close"
                    onClick={() => {
                      setShowAddProduct(false)
                      setEditingProduct(null)
                    }}
                    aria-label="Tutup"
                  >
                    ×
                  </button>
                </div>

                <form
                  key={editingProduct?.id ?? 'new-product'}
                  id="productForm"
                  className="modal-form"
                  onSubmit={async (event) => {
                    event.preventDefault()

                    const form = event.currentTarget
                    const formData = new FormData(form)

                    const productData = {
                      name: String(formData.get('name') || '').trim(),
                      price: Number(formData.get('price')),
                      stock: Number(formData.get('stock')),
                      category: String(formData.get('category') || 'iPhone').trim(),
                      is_available: Number(formData.get('available')),
                      description: String(formData.get('description') || '').trim(),
                    }

                    if (
                      !productData.name ||
                      !Number.isFinite(productData.price) ||
                      productData.price <= 0 ||
                      !Number.isInteger(productData.stock) ||
                      productData.stock < 0 ||
                      ![0, 1].includes(productData.is_available)
                    ) {
                      alert('Periksa kembali data produk.')
                      return
                    }

                    try {
                      if (editingProduct) {
                        await updateProductApi(editingProduct.id, productData)
                      } else {
                        await createProduct(productData)
                      }

                      await loadProducts()

                      setShowAddProduct(false)

                      alert(
                        editingProduct
                          ? 'Produk berhasil diperbarui!'
                          : 'Produk berhasil ditambahkan!'
                      )

                      setEditingProduct(null)
                    } catch (error) {
                      alert(
                        error instanceof Error
                          ? error.message
                          : 'Terjadi kesalahan saat menyimpan produk.'
                      )
                    }
                  }}
                >
                  <label>
                    Nama produk
                    <input
                      name="name"
                      required
                      maxLength={100}
                      placeholder="Contoh: iPhone 16 Pro 256GB"
                      defaultValue={editingProduct?.name ?? ''}
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Harga jual
                      <input
                        name="price"
                        required
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Masukkan Harga Jual"
                        defaultValue={editingProduct?.price ?? ''}
                      />
                    </label>

                    <label>
                      Stok awal
                      <input
                        name="stock"
                        required
                        type="number"
                        min="0"
                        step="1"
                        placeholder="10"
                        defaultValue={editingProduct?.stock ?? ''}
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Kategori
                      <input
                        name="category"
                        maxLength={50}
                        placeholder="iPhone"
                        defaultValue={editingProduct?.category ?? 'iPhone'}
                      />
                    </label>

                    <label>
                      Status
                      <select
                        name="available"
                        defaultValue={String(editingProduct?.is_available ?? 1)}
                      >
                        <option value="1">Tersedia</option>
                        <option value="0">Tidak tersedia</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Deskripsi <span className="optional-label">Opsional</span>
                    <textarea
                      name="description"
                      rows={3}
                      maxLength={300}
                      placeholder="Warna, kapasitas, atau catatan produk"
                      defaultValue={editingProduct?.description ?? ''}
                    />
                  </label>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setShowAddProduct(false)
                        setEditingProduct(null)
                      }}
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      className="button button-primary"
                    >
                      Simpan produk
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          

              
{/* PELANGGAN */}
{activePage === 'customers' && (
  <section className="page-view" id="page-customers">

    {/* HEADER */}
    <div className="page-heading">
      <div>
        <p className="eyebrow">DATA PELANGGAN</p>
        <h1>Pelanggan</h1>
        <p className="subheading">
          Simpan informasi pelanggan untuk transaksi berikutnya.
        </p>
      </div>

      <button
        type="button"
        className="button button-primary"
        id="addCustomerButton"
        onClick={() => {
          setNewCustomerName('')
          setNewCustomerPhone('')
          setCustomerFormError('')
          setShowAddCustomer(true)
        }}
      >
        <span>＋</span> Tambah pelanggan
      </button>
    </div>

    {/* STATISTIK */}
    <div className="stats-strip customer-strip">
      <div>
        <span className="strip-icon lavender">♙</span>
        <span>
          <small>Total pelanggan</small>
          <strong>{customers.length}</strong>
        </span>
      </div>

      <div>
        <span className="strip-icon mint">◷</span>
        <span>
          <small>Pelanggan bertransaksi</small>
          <strong>{customersWithTransactions}</strong>
        </span>
      </div>

      <div>
        <span className="strip-icon sky">♧</span>
        <span>
          <small>Transaksi tercatat</small>
          <strong>{transactions.length}</strong>
        </span>
      </div>
    </div>

    {/* TABEL PELANGGAN */}
    <div className="panel table-panel">

      <div className="table-toolbar">
        <label className="search-box table-search">
          <span className="search-icon">⌕</span>
          <input
            id="customerSearch"
            type="search"
            placeholder="Cari nama atau nomor telepon..."
            value={customerSearch}
            onChange={(event) =>
              setCustomerSearch(event.target.value)
            }
          />
        </label>

        <span className="table-result">
          {filteredCustomers.length} pelanggan
        </span>
      </div>

      {/* PESAN ERROR API */}
      {customerError && (
        <div className="table-empty" role="alert">
          {customerError}

          <button
            type="button"
            className="text-button"
            onClick={() => void loadCustomers()}
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>PELANGGAN</th>
              <th>NOMOR TELEPON</th>
              <th>TRANSAKSI</th>
              <th>TOTAL BELANJA</th>
              <th>BERGABUNG</th>
            </tr>
          </thead>

          <tbody>
            {loadingCustomers ? (
              <tr>
                <td colSpan={5}>
                  Memuat data pelanggan...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  Belum ada pelanggan tersimpan.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const customerTransactions = transactions.filter(
                  (transaction) =>
                    transaction.customer.trim().toLowerCase() ===
                    customer.name.trim().toLowerCase()
                )

                const customerTotal = customerTransactions.reduce(
                  (total, transaction) =>
                    total + transaction.total,
                  0
                )

                return (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>

                    <td>{customer.phone || '—'}</td>

                    <td>
                      {customerTransactions.length}
                    </td>

                    <td>
                      {formatRupiah(customerTotal)}
                    </td>

                    <td>
                      {customer.created_at
                        ? new Date(
                            customer.created_at.replace(' ', 'T') + 'Z'
                          ).toLocaleDateString('id-ID')
                        : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* MODAL TAMBAH PELANGGAN */}
    {showAddCustomer && createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
        <div
  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
  role="dialog"
  aria-modal="true"
  aria-labelledby="customerModalTitle"
>

          {/* HEADER MODAL */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 
               id="customerModalTitle"
               className="text-xl font-bold text-slate-900">
                Tambah Pelanggan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Masukkan informasi pelanggan baru.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCustomer(false)}
              disabled={savingCustomer}
              className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              aria-label="Tutup form"
            >
              ×
            </button>
          </div>

          {/* FORM */}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveCustomer()
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nama Pelanggan *
              </label>

              <input
                type="text"
                value={newCustomerName}
                onChange={(event) =>
                  setNewCustomerName(event.target.value)
                }
                placeholder="Masukkan nama pelanggan"
                required
                disabled={savingCustomer}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nomor Telepon
              </label>

              <input
                type="tel"
                value={newCustomerPhone}
                onChange={(event) =>
                  setNewCustomerPhone(event.target.value)
                }
                placeholder="Contoh: 081234567890"
                disabled={savingCustomer}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {customerFormError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
              >
                {customerFormError}
              </div>
            )}

            {/* TOMBOL FORM */}
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                disabled={savingCustomer}
                className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={savingCustomer}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingCustomer
                  ? 'Menyimpan...'
                  : 'Simpan Pelanggan'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )}

  </section>
)}

          {/* TRANSAKSI */}
          {activePage === 'transactions' && (
            <section className="page-view" id="page-transactions">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">RIWAYAT PENJUALAN</p>
                  <h1>Transaksi</h1>
                  <p className="subheading">Lihat transaksi yang telah diselesaikan.</p>
                </div>
                <button
                  className="button button-outline"
                  id="exportTransactions"
                  onClick={exportTransactions}
                >
                  ↓ <span>Ekspor CSV</span>
                </button>
              </div>

              <div className="stats-strip transaction-strip">
                <div>
                  <span className="strip-icon mint">↗</span>
                  <span><small>Total penjualan</small><strong>{formatRupiah(totalSales)}</strong></span>
                </div>
                <div>
                  <span className="strip-icon lavender">▤</span>
                  <span><small>Jumlah transaksi</small><strong>{transactions.length}</strong></span>
                </div>
                <div>
                  <span className="strip-icon sky">◷</span>
                  <span><small>Rata-rata transaksi</small><strong>{formatRupiah(averageTransaction)}</strong></span>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-toolbar">
                  <label className="search-box table-search">
                    <span className="search-icon">⌕</span>
                    <input
                      id="transactionSearch"
                      type="search"
                      placeholder="Cari ID transaksi atau pelanggan..."
                      value={transactionSearch}
                      onChange={(event) => setTransactionSearch(event.target.value)}
                    />
                  </label>
                  <span className="table-result">
                    {filteredTransactions.length} transaksi
                  </span>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>ID TRANSAKSI</th>
                        <th>PELANGGAN</th>
                        <th>TANGGAL</th>
                        <th>ITEM</th>
                        <th>PEMBAYARAN</th>
                        <th className="align-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td><strong>{transaction.id}</strong></td>
                          <td>{transaction.customer}</td>
                          <td>{new Date(transaction.date).toLocaleString('id-ID')}</td>
                          <td>
                            {transaction.items.map((item) => (
                              <div key={item.productId}>
                                {item.productName} × {item.quantity}
                              </div>
                            ))}
                          </td>
                          <td>{transaction.paymentMethod}</td>
                          <td className="align-right">
                            <strong>{formatRupiah(transaction.total)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredTransactions.length === 0 && (
                  <div className="table-empty">
                    Belum ada transaksi. Transaksi selesai akan muncul di sini.
                  </div>
                )}
              </div>
</section>
)}
        </div>
      </main>

      <div className="toast-region" id="toastRegion" aria-live="polite" />
    </div>
  )
}

export default App
