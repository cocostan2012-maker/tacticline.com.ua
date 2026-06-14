const PRODUCTS = window.PRODUCTS || [];
const TELEGRAM_USERNAME = "NordicKostya";

const grid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const categorySelect = document.querySelector("#categorySelect");
const sortSelect = document.querySelector("#sortSelect");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const cartToggle = document.querySelector("#cartToggle");
const cartBody = document.querySelector("#cartBody");
const cartCount = document.querySelector("#cartCount");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const clearCart = document.querySelector("#clearCart");
const telegramOrder = document.querySelector("#telegramOrder");
const modal = document.querySelector("#productModal");
const modalBody = document.querySelector("#modalBody");
const modalClose = document.querySelector("#modalClose");

let cart = JSON.parse(localStorage.getItem("tacticline-cart") || "[]");

function formatPrice(price) {
  return typeof price === "number" ? `${price.toLocaleString("uk-UA")} грн` : "Ціну уточнюйте";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initCategories() {
  const categories = [...new Set(PRODUCTS.map(product => product.category))].sort((a, b) => a.localeCompare(b, "uk"));
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  }
}

function getFilteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  const sort = sortSelect.value;

  let items = PRODUCTS.filter(product => {
    const text = [
      product.title,
      product.category,
      product.description,
      product.fullDescription,
      ...(product.tags || []),
      ...(product.specs || []),
      ...(product.package || [])
    ].join(" ").toLowerCase();
    const matchesSearch = !query || text.includes(query);
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  if (sort === "price-asc") {
    items.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
  }
  if (sort === "price-desc") {
    items.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
  }
  if (sort === "name-asc") {
    items.sort((a, b) => a.title.localeCompare(b.title, "uk"));
  }
  return items;
}

function renderProducts() {
  const items = getFilteredProducts();
  resultCount.textContent = `${items.length} товарів`;
  emptyState.hidden = items.length !== 0;
  grid.innerHTML = items.map(product => `
    <article class="product-card">
      <div class="product-visual" aria-hidden="true">
        <span>${escapeHtml(product.icon || "•")}</span>
        <div class="badge">${escapeHtml(product.category)}</div>
      </div>
      <h3>${escapeHtml(product.title)}</h3>
      <p class="product-desc">${escapeHtml(product.description)}</p>
      <div class="meta-list">
        ${(product.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="price-row">
        <div class="price">${formatPrice(product.price)}</div>
        <div class="stock">${escapeHtml(product.stock || "уточнюйте")}</div>
      </div>
      <div class="card-actions">
        <button class="button button-primary" type="button" data-add="${escapeHtml(product.id)}">В кошик</button>
        <button class="button button-secondary" type="button" data-detail="${escapeHtml(product.id)}">Детальніше</button>
      </div>
    </article>
  `).join("");
}

function openDetails(id) {
  const product = PRODUCTS.find(item => item.id === id);
  if (!product || !modal || !modalBody) return;

  modalBody.innerHTML = `
    <div class="modal-visual" aria-hidden="true">${escapeHtml(product.icon || "•")}</div>
    <p class="eyebrow">${escapeHtml(product.category)}</p>
    <h2>${escapeHtml(product.title)}</h2>
    <p class="modal-description">${escapeHtml(product.fullDescription || product.description)}</p>
    <div class="modal-price-row">
      <strong>${formatPrice(product.price)}</strong>
      <span>${escapeHtml(product.stock || "уточнюйте")}</span>
    </div>
    ${(product.tags || []).length ? `
      <div class="meta-list modal-tags">
        ${product.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
    ` : ""}
    ${(product.specs || []).length ? `
      <h3>Параметри</h3>
      <ul class="detail-list">
        ${product.specs.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    ` : ""}
    ${(product.package || []).length ? `
      <h3>Комплектація</h3>
      <ul class="detail-list">
        ${product.package.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    ` : ""}
    <div class="modal-actions">
      <button class="button button-primary" type="button" data-add="${escapeHtml(product.id)}">Додати в кошик</button>
      <a class="button button-secondary" href="https://t.me/${TELEGRAM_USERNAME}" target="_blank" rel="noopener">Запитати в Telegram</a>
    </div>
  `;

  modal.showModal();
}

function closeDetails() {
  if (modal?.open) modal.close();
}

function saveCart() {
  localStorage.setItem("tacticline-cart", JSON.stringify(cart));
}

function addToCart(id) {
  const product = PRODUCTS.find(item => item.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function renderCart() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => {
    const product = PRODUCTS.find(product => product.id === item.id);
    return sum + ((product?.price || 0) * item.qty);
  }, 0);

  cartCount.textContent = totalQty;
  cartItems.innerHTML = cart.length
    ? cart.map(item => {
      const product = PRODUCTS.find(product => product.id === item.id);
      if (!product) return "";
      return `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(product.title)}</strong>
            <small>${item.qty} × ${formatPrice(product.price)}</small>
          </div>
          <button class="icon-button" type="button" data-remove="${escapeHtml(product.id)}">×</button>
        </div>
      `;
    }).join("")
    : `<p class="cart-note">Кошик порожній. Додай товар із каталогу.</p>`;

  cartTotal.textContent = `${totalPrice.toLocaleString("uk-UA")} грн`;
  updateTelegramLink();
}

function updateTelegramLink() {
  if (!cart.length) {
    telegramOrder.href = `https://t.me/${TELEGRAM_USERNAME}`;
    return;
  }
  const lines = cart.map(item => {
    const product = PRODUCTS.find(product => product.id === item.id);
    return product ? `• ${product.title} — ${item.qty} шт. — ${formatPrice(product.price)}` : "";
  }).filter(Boolean);
  const message = [
    "Добрий день! Хочу замовити:",
    ...lines,
    "",
    "Підкажіть, будь ласка, наявність, актуальну ціну та умови доставки."
  ].join("\n");
  telegramOrder.href = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`;
}

function openCart() {
  cartBody.hidden = false;
  cartToggle.setAttribute("aria-expanded", "true");
}

function toggleCart() {
  const isHidden = cartBody.hidden;
  cartBody.hidden = !isHidden;
  cartToggle.setAttribute("aria-expanded", String(isHidden));
}

searchInput.addEventListener("input", renderProducts);
categorySelect.addEventListener("change", renderProducts);
sortSelect.addEventListener("change", renderProducts);
cartToggle.addEventListener("click", toggleCart);
clearCart.addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
});

grid.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  const detailButton = event.target.closest("[data-detail]");
  if (addButton) addToCart(addButton.dataset.add);
  if (detailButton) openDetails(detailButton.dataset.detail);
});

modalBody?.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) addToCart(addButton.dataset.add);
});

modalClose?.addEventListener("click", closeDetails);
modal?.addEventListener("click", event => {
  if (event.target === modal) closeDetails();
});

initCategories();
renderProducts();
renderCart();
