/* Frontend POS iPhone. Produk memakai API Node.js; pelanggan/transaksi disimpan di browser. */
const API_BASE = "http://localhost:3000/api";
const CUSTOMER_KEY = "iphone_pos_customers_v1";
const TRANSACTION_KEY = "iphone_pos_transactions_v1";

const state = {
  page: "sales",
  products: [],
  customers: readStorage(CUSTOMER_KEY, []),
  transactions: readStorage(TRANSACTION_KEY, []),
  cart: [],
  category: "Semua",
  search: ""
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const rupiah = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const safe = value => String(value == null ? "" : value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const dateTime = value => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const dateOnly = value => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
const initials = value => String(value || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
const todayKey = value => {
  const date = new Date(value);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
};

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
  } catch (_) {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    toast("Penyimpanan browser penuh atau tidak tersedia.", "error");
    return false;
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch (_) {
    throw new Error("Tidak dapat menghubungi Node.js API. Pastikan server berjalan di http://localhost:3000.");
  }
  let body = {};
  try { body = await response.json(); } catch (_) {}
  if (!response.ok || body.success === false) {
    throw new Error(body.error || body.message || "Permintaan ke API gagal.");
  }
  return body.data !== undefined ? body.data : body;
}

function setApiStatus(kind, message) {
  const indicator = $("#apiIndicator");
  indicator.className = "status-indicator " + kind;
  $("#apiStatusText").textContent = message;
}

async function loadProducts(showToast = false) {
  try {
    const result = await api("/products");
    state.products = Array.isArray(result) ? result : [];
    setApiStatus("online", "API terhubung");
    if (showToast) toast("Katalog produk berhasil diperbarui.", "success");
  } catch (error) {
    state.products = [];
    setApiStatus("offline", "API tidak terhubung");
    if (showToast) toast(error.message, "error");
  }
  renderAll();
}

function renderAll() {
  renderProducts();
  renderInventory();
  renderCustomers();
  renderTransactions();
  renderCustomerOptions();
  renderCart();
  renderDashboard();
}

function setPage(page) {
  state.page = page;
  $$(".page-view").forEach(view => { view.hidden = view.id !== "page-" + page; });
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.nav === page));
  const labels = { dashboard: "Ringkasan", sales: "Penjualan", products: "Produk", customers: "Pelanggan", transactions: "Transaksi" };
  $("#pageCrumb").textContent = labels[page] || "Penjualan";
  document.title = "Medan iStore — " + (labels[page] || "Penjualan");
  $("#sidebar").classList.remove("open");
  if (page === "products") renderInventory();
  if (page === "customers") renderCustomers();
  if (page === "transactions") renderTransactions();
}

function productArtClass(product) {
  const colors = ["", "art-violet", "art-graphite", "art-blue", "art-gold", "art-green", "art-pink"];
  const sum = Array.from(String(product.id || product.name || "")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return colors[(sum % (colors.length - 1)) + 1];
}

function filteredProducts() {
  const term = state.search.trim().toLowerCase();
  return state.products.filter(product => {
    const matchesCategory = state.category === "Semua" || String(product.category || "Lainnya") === state.category;
    const haystack = [product.name, product.category, product.description].join(" ").toLowerCase();
    return matchesCategory && haystack.includes(term) && Number(product.is_available ?? 1) === 1;
  });
}

function renderProducts() {
  const activeProducts = state.products.filter(product => Number(product.is_available ?? 1) === 1);
  const categories = ["Semua", ...new Set(activeProducts.map(product => product.category || "Lainnya"))];
  if (!categories.includes(state.category)) state.category = "Semua";
  $("#categoryTabs").innerHTML = categories.map(category =>
    '<button class="category-tab ' + (state.category === category ? "active" : "") + '" data-category="' + safe(category) + '">' + safe(category) + '</button>'
  ).join("");
  const products = filteredProducts();
  $("#catalogCount").textContent = products.length + (products.length === 1 ? " produk" : " produk");
  $("#productGrid").innerHTML = products.map(product => {
    const stock = Number(product.stock) || 0;
    const low = stock > 0 && stock <= 5;
    return '<article class="product-card ' + (stock <= 0 ? "oos" : "") + '">' +
      '<div class="phone-art ' + productArtClass(product) + '"><span class="stock-chip ' + (low ? "low" : "") + '">' + (stock <= 0 ? "Stok habis" : "Stok " + stock) + '</span><span class="phone-device"><span class="phone-screen"></span><i class="camera-pill"></i></span></div>' +
      '<div class="product-info"><div class="product-kicker"><span>' + safe(product.category || "iPhone") + '</span><span>ID #' + safe(product.id) + '</span></div>' +
      '<h3 class="product-name" title="' + safe(product.name) + '">' + safe(product.name) + '</h3><span class="product-price">' + rupiah(product.price) + '</span>' +
      '<div class="product-card-footer"><span class="cell-subtitle">' + (stock <= 0 ? "Tidak tersedia" : "Siap dijual") + '</span><button class="add-product" data-add="' + safe(product.id) + '" aria-label="Tambah ' + safe(product.name) + '" ' + (stock <= 0 ? "disabled" : "") + '>+</button></div></div></article>';
  }).join("");
  const noProducts = activeProducts.length === 0;
  $("#catalogEmpty").hidden = !noProducts;
  $("#productGrid").hidden = noProducts || products.length === 0;
  if (!noProducts && products.length === 0) {
    $("#productGrid").hidden = false;
    $("#productGrid").innerHTML = '<div class="empty-inline">Tidak ada produk yang cocok dengan pencarian.</div>';
  }
}

function renderInventory() {
  const term = ($("#inventorySearch")?.value || "").trim().toLowerCase();
  const products = state.products.filter(product => [product.name, product.category, product.description].join(" ").toLowerCase().includes(term));
  $("#inventoryCount").textContent = products.length + " produk";
  $("#productTableEmpty").hidden = products.length > 0;
  $("#productTableBody").innerHTML = products.map(product => {
    const stock = Number(product.stock) || 0;
    const available = Number(product.is_available ?? 1) === 1;
    const stockClass = stock <= 0 ? "empty" : stock <= 5 ? "low" : "";
    return '<tr><td><div class="product-cell"><span class="table-product-art">▣</span><span><strong>' + safe(product.name) + '</strong><small class="cell-subtitle">SKU-' + safe(product.id) + '</small></span></div></td>' +
      '<td>' + safe(product.category || "—") + '</td><td><strong>' + rupiah(product.price) + '</strong></td><td><span class="stock-pill ' + stockClass + '">' + stock + ' unit</span></td>' +
      '<td><span class="status-pill ' + (available ? "" : "unavailable") + '">' + (available ? "Tersedia" : "Nonaktif") + '</span></td>' +
      '<td><div class="row-actions"><button class="row-action" data-edit-product="' + safe(product.id) + '" title="Edit produk" aria-label="Edit produk">✎</button><button class="row-action delete" data-delete-product="' + safe(product.id) + '" title="Hapus produk" aria-label="Hapus produk">×</button></div></td></tr>';
  }).join("");
  $("#productStatTotal").textContent = state.products.length;
  $("#productStatLow").textContent = state.products.filter(product => Number(product.stock) <= 5).length + " produk";
  $("#productStatValue").textContent = rupiah(state.products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0));
}

function renderCustomerOptions() {
  const select = $("#customerSelect");
  const current = select.value;
  select.innerHTML = '<option value="">Pelanggan umum</option>' + state.customers.map(customer =>
    '<option value="' + safe(customer.id) + '">' + safe(customer.name) + (customer.phone ? " · " + safe(customer.phone) : "") + '</option>'
  ).join("");
  select.value = state.customers.some(customer => customer.id === current) ? current : "";
}

function customerStats(customer) {
  const sales = state.transactions.filter(transaction => transaction.customerId === customer.id);
  return { count: sales.length, total: sales.reduce((sum, transaction) => sum + Number(transaction.total || 0), 0) };
}

function renderCustomers() {
  const term = ($("#customerSearch")?.value || "").trim().toLowerCase();
  const customers = state.customers.filter(customer => [customer.name, customer.phone, customer.email].join(" ").toLowerCase().includes(term));
  $("#customerCount").textContent = customers.length + (customers.length === 1 ? " pelanggan" : " pelanggan");
  $("#customerTableEmpty").hidden = customers.length > 0;
  $("#customerTableBody").innerHTML = customers.map(customer => {
    const stats = customerStats(customer);
    return '<tr><td><span class="customer-avatar">' + safe(initials(customer.name)) + '</span><strong>' + safe(customer.name) + '</strong>' + (customer.email ? '<small class="cell-subtitle">' + safe(customer.email) + '</small>' : "") + '</td>' +
      '<td>' + safe(customer.phone || "—") + '</td><td>' + stats.count + '</td><td><strong>' + rupiah(stats.total) + '</strong></td><td>' + dateOnly(customer.createdAt) + '</td>' +
      '<td><div class="row-actions"><button class="row-action delete" data-delete-customer="' + safe(customer.id) + '" title="Hapus pelanggan" aria-label="Hapus pelanggan">×</button></div></td></tr>';
  }).join("");
  $("#customerStatTotal").textContent = state.customers.length;
  $("#customerStatActive").textContent = state.customers.filter(customer => customerStats(customer).count > 0).length;
  $("#customerStatOrders").textContent = state.transactions.length;
}

function transactionItemsCount(transaction) {
  return transaction.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function renderTransactions() {
  const term = ($("#transactionSearch")?.value || "").trim().toLowerCase();
  const transactions = [...state.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visible = transactions.filter(transaction => (transaction.id + " " + transaction.customerName).toLowerCase().includes(term));
  $("#transactionCount").textContent = visible.length + " transaksi";
  $("#transactionTableEmpty").hidden = visible.length > 0;
  $("#transactionTableBody").innerHTML = visible.map(transaction =>
    '<tr class="transaction-row" data-receipt="' + safe(transaction.id) + '"><td><span class="transaction-id">' + safe(transaction.id) + '</span></td>' +
    '<td><strong>' + safe(transaction.customerName || "Pelanggan umum") + '</strong></td><td>' + dateTime(transaction.createdAt) + '</td>' +
    '<td>' + transactionItemsCount(transaction) + ' item</td><td><span class="payment-pill">' + safe(transaction.paymentMethod) + '</span></td>' +
    '<td class="align-right"><strong>' + rupiah(transaction.total) + '</strong></td></tr>'
  ).join("");
  const total = transactions.reduce((sum, transaction) => sum + Number(transaction.total || 0), 0);
  $("#transactionStatSales").textContent = rupiah(total);
  $("#transactionStatCount").textContent = transactions.length;
  $("#transactionStatAverage").textContent = rupiah(transactions.length ? total / transactions.length : 0);
}

function renderDashboard() {
  const today = todayKey(new Date());
  const todayTransactions = state.transactions.filter(transaction => todayKey(transaction.createdAt) === today);
  $("#statSales").textContent = rupiah(todayTransactions.reduce((sum, transaction) => sum + Number(transaction.total || 0), 0));
  $("#statOrders").textContent = todayTransactions.length;
  $("#statProducts").textContent = state.products.filter(product => Number(product.is_available ?? 1) === 1).length;
  $("#statCustomers").textContent = state.customers.length;
  const recent = [...state.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  $("#recentTransactions").innerHTML = recent.length ? '<div class="recent-list">' + recent.map(transaction =>
    '<div class="recent-row"><span class="recent-avatar">' + safe(initials(transaction.customerName)) + '</span><span><strong>' + safe(transaction.customerName || "Pelanggan umum") + '</strong><small>' + safe(transaction.id) + ' · ' + dateTime(transaction.createdAt) + '</small></span><b>' + rupiah(transaction.total) + '</b></div>'
  ).join("") + '</div>' : '<div class="empty-inline">Belum ada transaksi.</div>';
  const lowStock = state.products.filter(product => Number(product.stock) <= 5 && Number(product.is_available ?? 1) === 1).slice(0, 5);
  $("#lowStockList").innerHTML = lowStock.length ? '<div class="stock-list">' + lowStock.map(product =>
    '<div class="stock-row"><span><strong>' + safe(product.name) + '</strong><small>' + safe(product.category || "iPhone") + '</small></span><span class="stock-count">' + Number(product.stock || 0) + ' tersisa</span></div>'
  ).join("") + '</div>' : '<div class="empty-inline">Tidak ada produk dengan stok menipis.</div>';
}

function cartSubtotal() {
  return state.cart.reduce((sum, line) => sum + Number(line.product.price || 0) * line.quantity, 0);
}

function renderCart(autoFillPayment = false) {
  const totalItems = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cartSubtotal();
  $("#cartItemCount").textContent = totalItems + (totalItems === 1 ? " item" : " item");
  $("#cartItems").innerHTML = state.cart.length ? state.cart.map(line =>
    '<div class="cart-line"><div class="cart-line-top"><span class="mini-phone">▣</span><span><span class="cart-line-name">' + safe(line.product.name) + '</span><span class="cart-line-price">' + rupiah(line.product.price) + '</span></span></div>' +
    '<strong class="cart-line-total">' + rupiah(line.product.price * line.quantity) + '</strong><div class="quantity-controls"><button data-quantity="' + safe(line.product.id) + '" data-delta="-1" aria-label="Kurangi jumlah">−</button><span>' + line.quantity + '</span><button data-quantity="' + safe(line.product.id) + '" data-delta="1" aria-label="Tambah jumlah">+</button></div></div>'
  ).join("") : '<div class="cart-empty"><span>＋</span><strong>Keranjang masih kosong</strong><small>Pilih produk dari katalog</small></div>';
  $("#cartSubtotal").textContent = rupiah(total);
  $("#cartTotal").textContent = rupiah(total);
  if (autoFillPayment && total > 0) $("#amountPaid").value = String(total);
  const paid = Number($("#amountPaid").value) || 0;
  $("#cartChange").textContent = rupiah(Math.max(0, paid - total));
  $("#checkoutButton").disabled = state.cart.length === 0 || paid < total;
}

function addToCart(productId) {
  const product = state.products.find(item => String(item.id) === String(productId));
  if (!product) return;
  const existing = state.cart.find(line => String(line.product.id) === String(productId));
  if ((existing ? existing.quantity : 0) >= Number(product.stock || 0)) {
    toast("Jumlah melebihi stok yang tersedia.", "error");
    return;
  }
  if (existing) existing.quantity += 1;
  else state.cart.push({ product, quantity: 1 });
  renderCart(true);
}

function changeQuantity(productId, delta) {
  const line = state.cart.find(item => String(item.product.id) === String(productId));
  if (!line) return;
  const next = line.quantity + delta;
  if (next <= 0) state.cart = state.cart.filter(item => String(item.product.id) !== String(productId));
  else if (next <= Number(line.product.stock || 0)) line.quantity = next;
  else return toast("Jumlah melebihi stok yang tersedia.", "error");
  renderCart(true);
}

function toast(message, type = "") {
  const element = document.createElement("div");
  element.className = "toast " + type;
  element.innerHTML = '<span>' + (type === "error" ? "!" : type === "success" ? "✓" : "i") + '</span><div>' + safe(message) + '</div>';
  $("#toastRegion").appendChild(element);
  setTimeout(() => element.remove(), 4200);
}

function openModal(formName, title, eyebrow = "DATA") {
  $("#productForm").hidden = formName !== "product";
  $("#customerForm").hidden = formName !== "customer";
  $("#receiptContent").hidden = formName !== "receipt";
  $("#modalTitle").textContent = title;
  $("#modalEyebrow").textContent = eyebrow;
  $("#modalBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("#modalBackdrop").hidden = true;
  document.body.style.overflow = "";
}

function openProductForm(product = null) {
  $("#productForm").reset();
  $("#productId").value = product ? product.id : "";
  $("#productName").value = product?.name || "";
  $("#productPrice").value = product?.price ?? "";
  $("#productStock").value = product?.stock ?? 0;
  $("#productCategory").value = product?.category || "iPhone";
  $("#productAvailable").value = String(product?.is_available ?? 1);
  $("#productDescription").value = product?.description || "";
  $("#productSubmitButton").textContent = product ? "Simpan perubahan" : "Simpan produk";
  openModal("product", product ? "Edit produk" : "Tambah produk", "KATALOG");
}

function openCustomerForm() {
  $("#customerForm").reset();
  $("#customerId").value = "";
  openModal("customer", "Tambah pelanggan", "PELANGGAN");
}

async function saveProduct(event) {
  event.preventDefault();
  const id = $("#productId").value;
  const product = {
    name: $("#productName").value.trim(),
    price: Number($("#productPrice").value),
    stock: Number($("#productStock").value),
    category: $("#productCategory").value.trim() || "iPhone",
    description: $("#productDescription").value.trim(),
    is_available: Number($("#productAvailable").value)
  };
  try {
    await api(id ? "/products/" + encodeURIComponent(id) : "/products", {
      method: id ? "PUT" : "POST", body: JSON.stringify(product)
    });
    closeModal();
    await loadProducts();
    toast(id ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.", "success");
  } catch (error) { toast(error.message, "error"); }
}

async function deleteProduct(id) {
  const product = state.products.find(item => String(item.id) === String(id));
  if (!product || !confirm('Hapus produk "' + product.name + '"?')) return;
  try {
    await api("/products/" + encodeURIComponent(id), { method: "DELETE" });
    state.cart = state.cart.filter(line => String(line.product.id) !== String(id));
    await loadProducts();
    toast("Produk berhasil dihapus.", "success");
  } catch (error) { toast(error.message, "error"); }
}

function saveCustomerRecord(customer) {
  const duplicate = state.customers.find(item => customer.phone && item.phone === customer.phone && item.id !== customer.id);
  if (duplicate) throw new Error("Nomor telepon sudah digunakan pelanggan lain.");
  const index = state.customers.findIndex(item => item.id === customer.id);
  if (index >= 0) state.customers[index] = { ...state.customers[index], ...customer };
  else state.customers.unshift(customer);
  saveStorage(CUSTOMER_KEY, state.customers);
  renderAll();
}

function saveCustomerForm(event) {
  event.preventDefault();
  try {
    saveCustomerRecord({
      id: "cus-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: $("#newCustomerName").value.trim(),
      phone: $("#newCustomerPhone").value.trim(),
      email: $("#newCustomerEmail").value.trim(),
      createdAt: new Date().toISOString()
    });
    closeModal();
    toast("Pelanggan berhasil disimpan.", "success");
  } catch (error) { toast(error.message, "error"); }
}

function deleteCustomer(id) {
  const customer = state.customers.find(item => item.id === id);
  if (!customer || !confirm('Hapus pelanggan "' + customer.name + '" dari daftar?')) return;
  state.customers = state.customers.filter(item => item.id !== id);
  saveStorage(CUSTOMER_KEY, state.customers);
  renderAll();
  toast("Pelanggan berhasil dihapus.", "success");
}

function newTransactionId() {
  const date = new Date();
  const stamp = date.getFullYear().toString().slice(-2) + String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0");
  return "TRX-" + stamp + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function checkout() {
  const total = cartSubtotal();
  const paid = Number($("#amountPaid").value) || 0;
  if (!state.cart.length || paid < total) return toast("Pastikan keranjang terisi dan pembayaran mencukupi.", "error");
  for (const line of state.cart) {
    const current = state.products.find(product => String(product.id) === String(line.product.id));
    if (!current || Number(current.stock) < line.quantity) {
      await loadProducts();
      return toast("Stok " + (line.product.name || "produk") + " tidak lagi mencukupi. Katalog sudah diperbarui.", "error");
    }
  }
  const selected = state.customers.find(customer => customer.id === $("#customerSelect").value);
  const customerName = $("#customerName").value.trim() || selected?.name || "Pelanggan umum";
  const customerPhone = $("#customerPhone").value.trim() || selected?.phone || "";
  let customerId = selected?.id || null;
  if ($("#saveCustomer").checked && customerName !== "Pelanggan umum") {
    const match = state.customers.find(customer => (customerPhone && customer.phone === customerPhone) || (!customerPhone && customer.name.toLowerCase() === customerName.toLowerCase()));
    customerId = match?.id || ("cus-" + Date.now().toString(36));
    try {
      saveCustomerRecord({
        id: customerId, name: customerName, phone: customerPhone, email: match?.email || "",
        createdAt: match?.createdAt || new Date().toISOString()
      });
    } catch (error) { return toast(error.message, "error"); }
  }

  const updated = [];
  try {
    for (const line of state.cart) {
      const current = state.products.find(product => String(product.id) === String(line.product.id));
      const nextStock = Number(current.stock) - line.quantity;
      await api("/products/" + encodeURIComponent(current.id), {
        method: "PUT", body: JSON.stringify({ stock: nextStock })
      });
      updated.push({ id: current.id, stock: current.stock });
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const previous of updated.reverse()) {
      try {
        await api("/products/" + encodeURIComponent(previous.id), {
          method: "PUT", body: JSON.stringify({ stock: previous.stock })
        });
      } catch (_) { rollbackFailed = true; }
    }
    await loadProducts();
    return toast(rollbackFailed ? "Pembaruan stok gagal dan sebagian stok mungkin perlu diperiksa di katalog." : "Transaksi gagal. Stok dikembalikan; " + error.message, "error");
  }

  const transaction = {
    id: newTransactionId(), createdAt: new Date().toISOString(), customerId,
    customerName, customerPhone, paymentMethod: $("#paymentMethod").value,
    items: state.cart.map(line => ({ productId: line.product.id, name: line.product.name, price: Number(line.product.price), quantity: line.quantity })),
    subtotal: total, total, paid, change: Math.max(0, paid - total)
  };
  state.transactions.unshift(transaction);
  saveStorage(TRANSACTION_KEY, state.transactions);
  state.cart = [];
  $("#customerSelect").value = "";
  $("#customerName").value = "";
  $("#customerPhone").value = "";
  $("#saveCustomer").checked = false;
  $("#amountPaid").value = "";
  await loadProducts();
  renderAll();
  openReceipt(transaction);
}

function openReceipt(transaction) {
  const items = transaction.items.map(item =>
    '<div class="receipt-line"><span>' + safe(item.name) + ' × ' + Number(item.quantity) + '</span><strong>' + rupiah(Number(item.price) * Number(item.quantity)) + '</strong></div>'
  ).join("");
  $("#receiptContent").innerHTML = '<div class="receipt-brand">iPhone POS</div><div class="receipt-meta">ID: ' + safe(transaction.id) + '<br>' + dateTime(transaction.createdAt) + '<br>Pelanggan: ' + safe(transaction.customerName || "Pelanggan umum") + (transaction.customerPhone ? '<br>Telepon: ' + safe(transaction.customerPhone) : "") + '</div>' +
    '<div class="receipt-summary">' + items + '</div><div class="receipt-line"><span>Metode pembayaran</span><strong>' + safe(transaction.paymentMethod) + '</strong></div><div class="receipt-line"><span>Dibayar</span><strong>' + rupiah(transaction.paid) + '</strong></div><div class="receipt-line"><span>Kembalian</span><strong>' + rupiah(transaction.change) + '</strong></div><div class="receipt-total"><span>Total</span><strong>' + rupiah(transaction.total) + '</strong></div>' +
    '<div class="receipt-actions"><button class="button button-outline" data-close-modal>Tutup</button><button class="button button-primary" id="printReceipt">Cetak struk</button></div>';
  openModal("receipt", "Transaksi berhasil", "PEMBAYARAN SELESAI");
}

function exportTransactions() {
  if (!state.transactions.length) return toast("Belum ada transaksi untuk diekspor.", "error");
  const rows = [["ID Transaksi", "Tanggal", "Pelanggan", "Telepon", "Item", "Metode", "Total", "Dibayar", "Kembalian"]];
  [...state.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(transaction => {
    rows.push([transaction.id, dateTime(transaction.createdAt), transaction.customerName, transaction.customerPhone, transaction.items.map(item => item.name + " x" + item.quantity).join("; "), transaction.paymentMethod, transaction.total, transaction.paid, transaction.change]);
  });
  const csv = rows.map(row => row.map(value => '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "transaksi-iphone-" + todayKey(new Date()) + ".csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.addEventListener("click", async event => {
    const nav = event.target.closest("[data-nav]");
    if (nav) return setPage(nav.dataset.nav);
    const go = event.target.closest("[data-go]");
    if (go) return setPage(go.dataset.go);
    const category = event.target.closest("[data-category]");
    if (category) { state.category = category.dataset.category; return renderProducts(); }
    const add = event.target.closest("[data-add]");
    if (add) return addToCart(add.dataset.add);
    const quantity = event.target.closest("[data-quantity]");
    if (quantity) return changeQuantity(quantity.dataset.quantity, Number(quantity.dataset.delta));
    const editProduct = event.target.closest("[data-edit-product]");
    if (editProduct) return openProductForm(state.products.find(product => String(product.id) === String(editProduct.dataset.editProduct)));
    const removeProduct = event.target.closest("[data-delete-product]");
    if (removeProduct) return deleteProduct(removeProduct.dataset.deleteProduct);
    const removeCustomer = event.target.closest("[data-delete-customer]");
    if (removeCustomer) return deleteCustomer(removeCustomer.dataset.deleteCustomer);
    const receiptRow = event.target.closest("[data-receipt]");
    if (receiptRow) {
      const transaction = state.transactions.find(item => item.id === receiptRow.dataset.receipt);
      if (transaction) openReceipt(transaction);
    }
    if (event.target.closest("[data-close-modal]") || event.target.id === "modalClose") closeModal();
    if (event.target.id === "printReceipt") window.print();
  });
  $("#productSearch").addEventListener("input", event => { state.search = event.target.value; renderProducts(); });
  $("#inventorySearch").addEventListener("input", renderInventory);
  $("#customerSearch").addEventListener("input", renderCustomers);
  $("#transactionSearch").addEventListener("input", renderTransactions);
  $("#refreshProducts").addEventListener("click", () => loadProducts(true));
  $("#addProductButton").addEventListener("click", () => openProductForm());
  $("#addCustomerButton").addEventListener("click", openCustomerForm);
  $("#productForm").addEventListener("submit", saveProduct);
  $("#customerForm").addEventListener("submit", saveCustomerForm);
  $("#checkoutButton").addEventListener("click", checkout);
  $("#amountPaid").addEventListener("input", renderCart);
  $("#clearCart").addEventListener("click", () => { state.cart = []; renderCart(true); });
  $("#exportTransactions").addEventListener("click", exportTransactions);
  $("#customerSelect").addEventListener("change", event => {
    const customer = state.customers.find(item => item.id === event.target.value);
    $("#customerName").value = customer?.name || "";
    $("#customerPhone").value = customer?.phone || "";
    $("#saveCustomer").checked = false;
  });
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#modalBackdrop").addEventListener("click", event => { if (event.target.id === "modalBackdrop") closeModal(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPage("sales");
      $("#productSearch").focus();
    }
  });
}

function boot() {
  const now = new Date();
  $("#todayLabel").textContent = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(now);
  $("#salesDate").textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  bindEvents();
  setPage("sales");
  renderAll();
  loadProducts();
}

document.addEventListener("DOMContentLoaded", boot);
