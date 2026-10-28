/* ==========================================================================
   WebdevV — app.js
   --------------------------------------------------------------------------
   TABLE OF CONTENTS
     1. Configuration ................ Supabase + storage bucket URLs, timings
     2. Static data .................. Popkern menu icons
     3. Supabase client & data layer . every network call lives here
     4. Small helpers ................ DOM + URL helpers used everywhere
     5. Shared UI .................... logos, demo switcher, sub-page nav,
                                       modals, item modal + cart, checkout wizard, calendar
     6. Popkern demo ................. menu, event banners, slideshow, flavors
     7. 3Dream demo .................. menu, search, catalog grid
     8. Deckcard demo ................ inventory grid, tabs, login, calendar
     9. Init ......................... wires everything together
   ========================================================================== */


/* ==========================================================================
   1. CONFIGURATION
   ========================================================================== */

const SUPABASE_URL = 'https://pcxudiubzqezdwjwvjfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHVkaXVienFlemR3and2amZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTQ1MjYsImV4cCI6MjEwODAzMDUyNn0.kOBtiuhquRmvPr3yTMTB0g6cpwj50PhjMNVlkel3jAE';

const STORAGE_URL = {
  logos:          `${SUPABASE_URL}/storage/v1/object/public/logos`,
  popkernImages:  `${SUPABASE_URL}/storage/v1/object/public/popkern_images`,
  deckcardImages: `${SUPABASE_URL}/storage/v1/object/public/deckcard_images`,
  threedreamImages: `${SUPABASE_URL}/storage/v1/object/public/threedream_images`
};

const SLIDE_INTERVAL_MS = 5000;

// Column in `deckcard_inventory` that holds how many of an item are in stock.
// Change this if your column has a different name.
const DECKCARD_STOCK_COLUMN = 'stock_quantity';

// Checkout (3Dream + Deckcard)
// PAYMENTS_DEMO_MODE = true  -> the Pay step only SIMULATES a payment: no money moves,
//                               nothing is sent anywhere, and nothing is saved.
// To go live, connect real Stripe / PayPal code in processCardPayment() and
// processPayPalPayment() (section 5.6), then set this to false.
const PAYMENTS_DEMO_MODE = true;
const SHIPPING_FEE = 5.99;   // demo flat rate; local pickup is free


/* ==========================================================================
   2. STATIC DATA
   ========================================================================== */

// Inline SVG emoji icons for the Popkern menu button.
const POPKERN_ICON_COLLAPSED = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌽</text></svg>';
const POPKERN_ICON_EXPANDED  = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍿</text></svg>';


/* ==========================================================================
   3. SUPABASE CLIENT & DATA LAYER
   Every function here returns plain data (never touches the DOM) and handles
   its own errors, so the UI code never has to worry about a failed request.
   ========================================================================== */

// The Supabase CDN script only exists on templates.html, so this is null on
// the other pages and every loader below simply returns an empty list.
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// "2026-11-07" -> { year, month (0-indexed), day, date }
function parseEventDate(isoDate) {
  const date = new Date(isoDate + 'T00:00:00');
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), date };
}

// The single way every table is read: select all rows ordered by one column.
// On any failure it logs a warning and returns [] so the UI shows its empty state.
async function loadTable(table, orderColumn, mapRow = row => row) {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient
      .from(table)
      .select('*')
      .order(orderColumn, { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRow);
  } catch (err) {
    console.warn(`Could not fetch ${table}:`, err.message);
    return [];
  }
}

// ---- Row mappers (database row -> shape the UI uses) ----

function toPopkernEvent(row) {
  const { year, month, day, date } = parseEventDate(row.event_date);
  return {
    year, month, day,
    title: row.title,
    startTime: row.start_time || '9:00 AM',
    endTime: row.end_time || '5:00 PM',
    formattedDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  };
}

function toDeckcardEvent(row) {
  const { year, month, day } = parseEventDate(row.event_date);
  return {
    year, month, day,
    title: row.title,
    time: row.time || 'TBD',
    description: row.description || 'No additional details provided.'
  };
}

// ---- The four tables ----

const loadPopkernEvents     = () => loadTable('popkern_events',     'event_date', toPopkernEvent);
const loadPopkernFlavors    = () => loadTable('popkern_flavors',    'name');
const loadDeckcardInventory = () => loadTable('deckcard_inventory', 'name');
const loadDeckcardEvents    = () => loadTable('deckcard_events',    'event_date', toDeckcardEvent);
const loadThreeDreamItems   = () => loadTable('threedream_items',   'name');


/* ==========================================================================
   4. SMALL HELPERS
   ========================================================================== */

const byId = id => document.getElementById(id);

// Creates an element with optional class and text (text is inserted safely as text).
function createEl(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Small "nothing here" note appended to a container (grid, calendar, ...).
function createEmptyMessage(text) {
  const p = document.createElement('p');
  p.className = 'empty-message';
  p.textContent = text;
  return p;
}

function getLogoUrl(filename) {
  const fallbackUrl = `${STORAGE_URL.logos}/${filename}`;
  if (!supabaseClient) return fallbackUrl;

  const { data } = supabaseClient.storage.from('logos').getPublicUrl(filename);
  return (data && data.publicUrl) || fallbackUrl;
}

function resolveFlavorImageUrl(flavor) {
  if (flavor.image_url && flavor.image_url.startsWith('http')) return flavor.image_url;

  const filename = flavor.image_filename
    || flavor.image_url
    || `${flavor.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
  return `${STORAGE_URL.popkernImages}/${filename}`;
}

function resolveDeckcardImageUrl(item) {
  if (item.image_url) {
    return item.image_url.startsWith('http')
      ? item.image_url
      : `${STORAGE_URL.deckcardImages}/${item.image_url}`;
  }
  if (item.image_filename) return `${STORAGE_URL.deckcardImages}/${item.image_filename}`;
  return null;
}

function resolveThreeDreamImageUrl(item) {
  if (!item.image_url) return null;
  return item.image_url.startsWith('http')
    ? item.image_url
    : `${STORAGE_URL.threedreamImages}/${item.image_url}`;
}

function formatPrice(value) {
  return value === null || value === undefined ? '' : `$${Number(value).toFixed(2)}`;
}


/* ==========================================================================
   5. SHARED UI
   ========================================================================== */

/* ---- 5.1 Logos ---------------------------------------------------------- */

function applyLogo(selector, url, alt, fallbackAlt) {
  document.querySelectorAll(selector).forEach(img => {
    img.src = url;
    img.alt = alt;
    img.onerror = () => { img.alt = fallbackAlt; };
  });
}

function loadLogos() {
  applyLogo('.agency-logo-img',
    getLogoUrl('webdevv_logo.png'), 'WebdevV Agency Logo', '⚡ WebdevV');
  applyLogo('#demo-popkern .demo-logo-img',
    getLogoUrl('popkern_logo.png'), '🍿 Popkern Logo', '🍿 Popkern');
  applyLogo('#demo-threedream .demo-logo-img',
    getLogoUrl('threedream_logo.png'), '⚡ 3Dream Logo', '⚡ 3Dream');
  applyLogo('#demo-deckcard .demo-logo-img',
    getLogoUrl('deckcard_logo.png'), '🃏 Deckcard Logo', '🃏 Deckcard');
}


/* ---- 5.2 Demo switcher (the Popkern / 3Dream / Deckcard / Dentra bar) ---- */

// Puts a demo back on its Home page (menus closed, Home highlighted).
function resetDemoToHome(wrapper) {
  closePopkernDropdown();
  closeThreeDreamDropdown();
  hideOrderConfirmation('3dream');
  hideOrderConfirmation('deckcard');

  const homeLink = wrapper.querySelector('a[data-page="home"]');
  if (homeLink) homeLink.click();   // reuses the normal sub-page navigation
}

function setupDemoSwitcher() {
  const buttons = document.querySelectorAll('.demo-btn');
  const wrappers = document.querySelectorAll('.demo-wrapper');
  if (buttons.length === 0) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      wrappers.forEach(w => w.classList.remove('active-demo'));

      btn.classList.add('active');
      const activeWrapper = byId(`demo-${btn.getAttribute('data-target')}`);
      if (activeWrapper) {
        activeWrapper.classList.add('active-demo');
        resetDemoToHome(activeWrapper);
      }
      window.scrollTo(0, 0);
    });
  });

  // Deep link: templates.html?demo=deckcard
  const requestedDemo = new URLSearchParams(window.location.search).get('demo');
  if (requestedDemo) {
    const match = document.querySelector(`.demo-btn[data-target="${requestedDemo}"]`);
    if (match) match.click();
  }
}


/* ---- 5.3 Sub-page navigation inside each demo --------------------------- */

// Code that runs each time a sub-page is opened (keyed by the page's element id).
const pageEnterHooks = {
  'td-inquiries': () => resetInquiryForm()
};

function setupSubpageNav(navSelector, pageClass) {
  document.querySelectorAll(navSelector).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const pageId = link.getAttribute('data-page');
      const demo = link.closest('.demo-wrapper');

      demo.querySelectorAll(navSelector).forEach(l => l.classList.remove('active'));
      demo.querySelectorAll(`.${pageClass}`).forEach(p => p.classList.remove('active-subpage'));

      const activeLink = demo.querySelector(
        `nav a[data-page="${pageId}"], .pk-dropdown-content a[data-page="${pageId}"], .td-dropdown-content a[data-page="${pageId}"]`
      );
      if (activeLink) activeLink.classList.add('active');

      const targetPage = demo.querySelector(`[id$="-${pageId}"]`);
      if (targetPage) {
        targetPage.classList.add('active-subpage');
        const onEnter = pageEnterHooks[targetPage.id];
        if (onEnter) onEnter();
      }
    });
  });
}

function setupAllSubpageNavs() {
  setupSubpageNav('.popkern-nav-link', 'popkern-page');
  setupSubpageNav('.td-nav-link',      'td-page');
  setupSubpageNav('.dc-nav-link',      'dc-page');
  setupSubpageNav('.dt-nav-link',      'dt-page');
}


/* ---- 5.4 Modal dismissal (backdrop click + Escape key) ------------------ */

function setupModalDismissal() {
  document.querySelectorAll('.frosted-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.frosted-modal-overlay:not(.hidden)')
      .forEach(overlay => overlay.classList.add('hidden'));
  });
}


/* ---- 5.5 Item modal + shopping cart (3Dream & Deckcard) ----------------- */

// One cart per demo. Each entry: { name, price (number|null), qty }
const cart = {
  activeItem: null,   // item currently open in the modal: { name, price, cartType }
  items: { '3dream': [], deckcard: [] },
  ui: {
    '3dream':  { badge: '.td-cart-count', list: 'td-cart-items-container', checkoutBtn: 'td-checkout-btn', checkoutSection: 'td-checkout-section',
                 confirmation: 'td-order-confirmation', itemsLink: '.td-nav-link[data-page="items"]' },
    deckcard:  { badge: '.dc-cart-count', list: 'dc-cart-items-container', checkoutBtn: 'dc-checkout-btn', checkoutSection: 'dc-checkout-section',
                 confirmation: 'dc-order-confirmation', itemsLink: '.dc-nav-link[data-page="items"]' }
  }
};

// ---- Cart state ----

// stock = how many exist (number), or null when the item has no limit.
function addToCart(type, { name, price, stock = null }, qty = 1) {
  hideOrderConfirmation(type);
  const lines = cart.items[type];
  const existing = lines.find(line => line.name === name);
  const cap = stock === null ? Infinity : stock;

  if (existing) existing.qty = Math.min(existing.qty + qty, cap);
  else lines.push({ name, price, stock, qty: Math.min(qty, cap) });
  renderCart(type);
}

function getQtyInCart(type, name) {
  const line = cart.items[type].find(l => l.name === name);
  return line ? line.qty : 0;
}

// How many more of this item can be added right now (respects stock + cart).
function getMaxAddable(type, name, stock) {
  if (stock === null) return MAX_ITEM_QTY;
  return Math.max(0, Math.min(MAX_ITEM_QTY, stock - getQtyInCart(type, name)));
}

// Database value -> whole number of units in stock, or null if unknown / no limit.
function toStock(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function changeCartQty(type, name, delta) {
  const lines = cart.items[type];
  const line = lines.find(l => l.name === name);
  if (!line) return;
  if (delta > 0 && line.stock !== null && line.qty + delta > line.stock) return;

  line.qty += delta;
  if (line.qty <= 0) removeFromCart(type, name);
  else renderCart(type);
}

function removeFromCart(type, name) {
  cart.items[type] = cart.items[type].filter(line => line.name !== name);
  renderCart(type);
}

function getCartCount(type) {
  return cart.items[type].reduce((sum, line) => sum + line.qty, 0);
}

function getCartTotal(type) {
  return cart.items[type].reduce((sum, line) => sum + (Number(line.price) || 0) * line.qty, 0);
}

// ---- Cart rendering ----

function createQtyButton(label, ariaLabel, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cart-qty-btn';
  btn.textContent = label;
  btn.setAttribute('aria-label', ariaLabel);
  btn.addEventListener('click', onClick);
  return btn;
}

function createCartRow(type, line) {
  const row = document.createElement('div');
  row.className = 'cart-row';

  const info = document.createElement('div');
  info.className = 'cart-row-info';
  const name = document.createElement('div');
  name.className = 'cart-row-name';
  name.textContent = line.name;
  const unit = document.createElement('div');
  unit.className = 'cart-row-unit';
  unit.textContent = line.price != null ? `${formatPrice(line.price)} each` : '';
  info.append(name, unit);

  const qty = document.createElement('div');
  qty.className = 'cart-qty';
  const qtyValue = document.createElement('span');
  qtyValue.textContent = line.qty;
  const minusBtn = createQtyButton('−', `Decrease quantity of ${line.name}`, () => changeCartQty(type, line.name, -1));
  const plusBtn  = createQtyButton('+', `Increase quantity of ${line.name}`, () => changeCartQty(type, line.name, 1));
  if (line.stock !== null && line.qty >= line.stock) {
    plusBtn.disabled = true;
    plusBtn.title = 'No more in stock';
  }
  qty.append(minusBtn, qtyValue, plusBtn);

  const lineTotal = document.createElement('div');
  lineTotal.className = 'cart-row-total';
  lineTotal.textContent = formatPrice((Number(line.price) || 0) * line.qty);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'cart-remove-btn';
  remove.textContent = 'Remove';
  remove.setAttribute('aria-label', `Remove ${line.name} from cart`);
  remove.addEventListener('click', () => removeFromCart(type, line.name));

  row.append(info, qty, lineTotal, remove);
  return row;
}

// Redraws one demo's cart list, the menu badge, and the checkout button.
function renderCart(type) {
  const ui = cart.ui[type];
  const lines = cart.items[type];
  const list = byId(ui.list);
  const checkoutBtn = byId(ui.checkoutBtn);
  const checkoutSection = byId(ui.checkoutSection);

  document.querySelectorAll(ui.badge).forEach(badge => { badge.textContent = getCartCount(type); });
  if (!list) return;

  list.innerHTML = '';

  if (lines.length === 0) {
    list.appendChild(createEmptyMessage('Your cart is empty.'));
    if (checkoutBtn) checkoutBtn.hidden = true;
    if (checkoutSection) checkoutSection.hidden = true;
    return;
  }

  lines.forEach(line => list.appendChild(createCartRow(type, line)));

  const total = document.createElement('div');
  total.className = 'cart-total';
  total.textContent = `Total: ${formatPrice(getCartTotal(type))}`;
  list.appendChild(total);

  // Show the Checkout button unless the checkout area is already open.
  if (checkoutBtn) checkoutBtn.hidden = !!(checkoutSection && !checkoutSection.hidden);

  refreshCheckout(type);   // keep an open Review / Pay step in sync with the cart
}

// ---- Item modal ----

const MAX_ITEM_QTY = 99;

// Highest quantity the popup currently allows (stock- and cart-aware).
function getModalMax() {
  return cart.activeItem ? Math.max(cart.activeItem.maxQty, 1) : MAX_ITEM_QTY;
}

// Quantity box value as a whole number between 1 and the modal's max.
function readModalQty() {
  const value = parseInt(byId('gen-modal-qty').value, 10);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, getModalMax());
}

function setModalQty(value) {
  byId('gen-modal-qty').value = Math.min(Math.max(value, 1), getModalMax());
}

// "5 available" / "Out of stock" note, plus disabling the controls when nothing can be added.
function updateModalStock(item) {
  const note = byId('gen-modal-stock');
  const soldOut = item.maxQty < 1;

  if (note) {
    if (item.stock === null) {
      note.hidden = true;
    } else {
      note.hidden = false;
      note.textContent = item.stock === 0
        ? 'Out of stock'
        : soldOut
          ? 'All available stock is already in your cart'
          : `${item.maxQty} available`;
    }
  }

  ['gen-modal-qty', 'gen-modal-qty-minus', 'gen-modal-qty-plus', 'gen-modal-add']
    .forEach(id => { byId(id).disabled = soldOut; });
}

// Opens the shared item modal. imageUrl, price (a number) and stock (a number, or null = unlimited) are optional.
function openItemModal({ name, description, cartType, imageUrl = null, price = null, stock = null }) {
  const maxQty = getMaxAddable(cartType, name, stock);
  cart.activeItem = { name, price, cartType, stock, maxQty };
  updateModalStock(cart.activeItem);
  setModalQty(1);

  const imageBox = byId('gen-modal-img');
  imageBox.textContent = '';
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = name;
    img.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:8px;';
    img.onerror = () => { imageBox.textContent = `[ALT Image: ${name}]`; };
    imageBox.appendChild(img);
  } else {
    imageBox.textContent = `[ALT Image: ${name}]`;
  }

  const priceText = formatPrice(price);
  const priceEl = byId('gen-modal-price');
  if (priceEl) {
    priceEl.textContent = priceText;
    priceEl.hidden = !priceText;
  }

  byId('gen-modal-title').textContent = name;
  byId('gen-modal-desc').textContent = description;
  byId('generic-item-modal').classList.remove('hidden');
}

// ---- Pop-up message (toast) ----------------------------------------------
// Shows `text` near `anchorRect` (an element's getBoundingClientRect()) and hides it
// after `duration` ms. Options:
//   variant:  'success' (green, default) or 'error' (red)
//   above:    true = sit just above the anchor instead of centred on it
//   duration: how long it stays, in ms (default 2000)

let toastTimer = null;

function hideToast() {
  clearTimeout(toastTimer);
  const toast = byId('toast');
  if (toast) toast.hidden = true;
}

function showToast(text, anchorRect, { variant = 'success', above = false, duration = 2000 } = {}) {
  const toast = byId('toast');
  if (!toast) return;

  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.classList.toggle('is-error', variant === 'error');
  toast.hidden = false;

  const margin = 8;
  const halfW = toast.offsetWidth / 2;
  const halfH = toast.offsetHeight / 2;
  const x = anchorRect.left + anchorRect.width / 2;
  let y = anchorRect.top + anchorRect.height / 2;
  if (above) {
    y = anchorRect.top - halfH - margin;
    if (y - halfH < margin) y = anchorRect.bottom + halfH + margin;   // no room above: go below
  }
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

  toast.style.left = `${clamp(x, halfW + margin, window.innerWidth - halfW - margin)}px`;
  toast.style.top  = `${clamp(y, halfH + margin, window.innerHeight - halfH - margin)}px`;

  toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

function setupItemModal() {
  const modal = byId('generic-item-modal');
  const addBtn = byId('gen-modal-add');
  const closeBtn = byId('gen-modal-close');
  const qtyInput = byId('gen-modal-qty');

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  // Quantity box: − / + buttons, digits only, clamped to 1..MAX_ITEM_QTY
  byId('gen-modal-qty-minus').addEventListener('click', () => setModalQty(readModalQty() - 1));
  byId('gen-modal-qty-plus').addEventListener('click',  () => setModalQty(readModalQty() + 1));
  qtyInput.addEventListener('input', () => {
    qtyInput.value = qtyInput.value.replace(/\D/g, '');
  });
  qtyInput.addEventListener('blur', () => setModalQty(readModalQty()));
  qtyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addBtn.click();
  });


  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const item = cart.activeItem;
      if (!item || !(item.cartType in cart.items)) return;

      const qty = readModalQty();
      addToCart(item.cartType, item, qty);

      // Measure the button while the popup is still visible, then close it.
      const buttonRect = addBtn.getBoundingClientRect();
      modal.classList.add('hidden');
      showToast(`${qty} of ${item.name} has been added to the cart!`, buttonRect);
    });
  }
}

/* ---- 5.6 Checkout wizard (3Dream & Deckcard) ---------------------------- */

// Contact -> Delivery -> Review -> Pay.  The Pay step is a DEMO (see PAYMENTS_DEMO_MODE):
// card details typed into the demo form are never read, sent, or stored.

const CHECKOUT_STEPS = ['Contact', 'Delivery', 'Review', 'Pay'];

const checkout = {
  '3dream':  { root: null, step: 1, delivery: 'pickup', payMethod: 'card' },
  deckcard:  { root: null, step: 1, delivery: 'pickup', payMethod: 'card' }
};

// ---- Payment providers (PLACEHOLDERS) ----
// Demo mode pretends the payment succeeded. For real payments, replace the body of each
// function: call your server (e.g. a Supabase Edge Function) that talks to Stripe / PayPal,
// then return { orderId } once the payment is confirmed. Throw an Error to show a message.

async function processCardPayment(order) {
  if (!PAYMENTS_DEMO_MODE) throw new Error('Card payments are not connected yet.');
  await wait(900);
  return { orderId: createDemoOrderId() };
}

async function processPayPalPayment(order) {
  if (!PAYMENTS_DEMO_MODE) throw new Error('PayPal payments are not connected yet.');
  await wait(900);
  return { orderId: createDemoOrderId() };
}

function createDemoOrderId() {
  return `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ---- Markup ----

// `type` makes the radio group name unique: same-named radios on one page act as ONE group.
function checkoutTemplate(type) {
  return `
    <h3>Checkout</h3>
    <ol class="checkout-steps" data-role="steps"></ol>

    <div class="checkout-panel demo-form" data-step="1">
      <h4>Contact information</h4>
      <label>Full name
        <input type="text" name="name" autocomplete="name" required>
      </label>
      <label>Email address
        <input type="email" name="email" autocomplete="email" required>
      </label>
      <label>Phone number (optional)
        <input type="tel" name="phone" autocomplete="tel">
      </label>
    </div>

    <div class="checkout-panel demo-form" data-step="2" hidden>
      <h4>Delivery</h4>
      <label class="checkout-choice is-selected">
        <input type="radio" name="delivery-${type}" value="pickup" checked>
        <span><strong>Local pickup</strong> · Free<br>We’ll let you know when your order is ready.</span>
      </label>
      <label class="checkout-choice">
        <input type="radio" name="delivery-${type}" value="shipping">
        <span><strong>Ship to me</strong> · ${formatPrice(SHIPPING_FEE)} flat rate</span>
      </label>
      <div data-role="address" hidden>
        <label>Street address
          <input type="text" name="street" autocomplete="street-address">
        </label>
        <label>City
          <input type="text" name="city" autocomplete="address-level2">
        </label>
        <div class="checkout-row">
          <label>State
            <input type="text" name="state" maxlength="2" pattern="[A-Za-z]{2}" title="Two-letter state code, for example FL" autocomplete="address-level1">
          </label>
          <label>ZIP code
            <input type="text" name="zip" inputmode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" title="5-digit ZIP code" autocomplete="postal-code">
          </label>
        </div>
      </div>
    </div>

    <div class="checkout-panel" data-step="3" hidden>
      <h4>Review your order</h4>
      <div data-role="review"></div>
    </div>

    <div class="checkout-panel" data-step="4" hidden>
      <h4>Payment</h4>
      <p class="checkout-demo-note">Demo only: no payment is taken. Please don’t enter real card details.</p>
      <div class="checkout-methods">
        <button type="button" class="checkout-method is-selected" data-method="card">Pay with card</button>
        <button type="button" class="checkout-method" data-method="paypal">PayPal</button>
      </div>

      <div class="demo-form" data-role="card-panel">
        <label>Name on card
          <input type="text" name="cardName" autocomplete="off" required>
        </label>
        <label>Card number
          <input type="text" name="cardNumber" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="1234 1234 1234 1234" required>
        </label>
        <div class="checkout-row">
          <label>Expiry
            <input type="text" name="cardExpiry" autocomplete="off" maxlength="5" placeholder="MM/YY" required>
          </label>
          <label>CVC
            <input type="text" name="cardCvc" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="123" required>
          </label>
        </div>
        <button type="button" class="checkout-primary-btn checkout-pay-btn" data-role="card-pay"></button>
      </div>

      <div data-role="paypal-panel" hidden>
        <p>You would be sent to PayPal to approve the payment. In this demo, no PayPal window opens.</p>
        <button type="button" class="checkout-primary-btn checkout-pay-btn" data-role="paypal-pay"></button>
      </div>

      <p class="checkout-error" data-role="pay-error" role="alert" hidden></p>
    </div>

    <div class="checkout-nav">
      <button type="button" class="demo-secondary-btn" data-role="back">Back</button>
      <button type="button" class="checkout-primary-btn" data-role="next">Continue</button>
    </div>`;
}

// ---- Order data ----

// Everything about the order in one object (also what a real payment call would receive).
function buildOrder(type) {
  const root = checkout[type].root;
  const value = name => root.querySelector(`[name="${name}"]`).value.trim();
  const method = checkout[type].delivery;

  const subtotal = getCartTotal(type);
  const shipping = method === 'shipping' ? SHIPPING_FEE : 0;

  return {
    type,
    contact: { name: value('name'), email: value('email'), phone: value('phone') },
    delivery: {
      method,
      address: method === 'shipping'
        ? { street: value('street'), city: value('city'), state: value('state').toUpperCase(), zip: value('zip') }
        : null
    },
    lines: cart.items[type].map(line => ({ ...line })),
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

// ---- Display pieces (shared by the Review step and the confirmation) ----

function createTextLines(lines) {
  const box = createEl('div', 'checkout-text-lines');
  lines.filter(Boolean).forEach(line => box.appendChild(createEl('div', '', line)));
  return box;
}

function createOrderLines(order) {
  const box = createEl('div', 'checkout-lines');
  order.lines.forEach(line => {
    const row = createEl('div', 'checkout-line');
    row.append(
      createEl('span', '', `${line.name} × ${line.qty}`),
      createEl('span', '', formatPrice((Number(line.price) || 0) * line.qty))
    );
    box.appendChild(row);
  });

  const totals = [
    ['Subtotal', formatPrice(order.subtotal)],
    [order.delivery.method === 'shipping' ? 'Shipping' : 'Local pickup', order.shipping ? formatPrice(order.shipping) : 'Free'],
    ['Total', formatPrice(order.total)]
  ];
  totals.forEach(([label, amount], i) => {
    const row = createEl('div', i === totals.length - 1 ? 'checkout-line checkout-line-total' : 'checkout-line checkout-line-sub');
    row.append(createEl('span', '', label), createEl('span', '', amount));
    box.appendChild(row);
  });
  return box;
}

function createDeliveryLines(order) {
  if (order.delivery.method === 'pickup') return createTextLines(['Local pickup']);
  const { street, city, state, zip } = order.delivery.address;
  return createTextLines(['Shipping', street, `${city}, ${state} ${zip}`]);
}

function createReviewBlock(title, contentEl, onEdit) {
  const block = createEl('div', 'checkout-review-block');
  const head = createEl('div', 'checkout-review-head');
  head.appendChild(createEl('strong', '', title));
  if (onEdit) {
    const editBtn = createEl('button', 'checkout-link-btn', 'Edit');
    editBtn.type = 'button';
    editBtn.addEventListener('click', onEdit);
    head.appendChild(editBtn);
  }
  block.append(head, contentEl);
  return block;
}

function renderCheckoutReview(type) {
  const order = buildOrder(type);
  const box = checkout[type].root.querySelector('[data-role="review"]');
  box.textContent = '';
  box.append(
    createReviewBlock('Items', createOrderLines(order)),
    createReviewBlock('Contact', createTextLines([order.contact.name, order.contact.email, order.contact.phone]),
      () => showCheckoutStep(type, 1)),
    createReviewBlock('Delivery', createDeliveryLines(order), () => showCheckoutStep(type, 2))
  );
}

function updatePayButtons(type) {
  const root = checkout[type].root;
  const total = formatPrice(buildOrder(type).total);
  root.querySelector('[data-role="card-pay"]').textContent = `Pay ${total}`;
  root.querySelector('[data-role="paypal-pay"]').textContent = `Pay ${total} with PayPal`;
}

// ---- Step handling ----

function showCheckoutStep(type, step) {
  const state = checkout[type];
  const root = state.root;
  state.step = Math.min(Math.max(step, 1), CHECKOUT_STEPS.length);

  root.querySelectorAll('.checkout-panel').forEach(panel => {
    panel.hidden = Number(panel.dataset.step) !== state.step;
  });
  root.querySelectorAll('.checkout-step').forEach((item, i) => {
    item.classList.toggle('is-active', i + 1 === state.step);
    item.classList.toggle('is-done', i + 1 < state.step);
    item.querySelector('.checkout-step-num').textContent = i + 1 < state.step ? '✓' : String(i + 1);
  });

  root.querySelector('[data-role="back"]').hidden = state.step === 1;
  root.querySelector('[data-role="next"]').hidden = state.step === CHECKOUT_STEPS.length;
  root.querySelector('[data-role="pay-error"]').hidden = true;

  if (state.step === 3) renderCheckoutReview(type);
  if (state.step === 4) updatePayButtons(type);
}

// Checks the visible inputs of a container; shows the browser's own message on the first problem.
function validateInputs(container) {
  for (const input of container.querySelectorAll('input')) {
    if (input.closest('[hidden]')) continue;   // ignore fields that are not showing
    if (!input.checkValidity()) {
      input.reportValidity();
      input.focus();
      return false;
    }
  }
  return true;
}

function validateCheckoutStep(type, step) {
  const panel = checkout[type].root.querySelector(`.checkout-panel[data-step="${step}"]`);
  return validateInputs(panel);
}

function setDeliveryUi(type) {
  const { root, delivery } = checkout[type];
  const isShipping = delivery === 'shipping';

  root.querySelector('[data-role="address"]').hidden = !isShipping;
  ['street', 'city', 'state', 'zip'].forEach(name => {
    root.querySelector(`[name="${name}"]`).required = isShipping;
  });
  root.querySelectorAll('.checkout-choice').forEach(choice => {
    choice.classList.toggle('is-selected', choice.querySelector('input').checked);
  });
}

function setPayMethodUi(type) {
  const { root, payMethod } = checkout[type];
  root.querySelector('[data-role="card-panel"]').hidden = payMethod !== 'card';
  root.querySelector('[data-role="paypal-panel"]').hidden = payMethod !== 'paypal';
  root.querySelectorAll('.checkout-method').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.method === payMethod);
  });
  root.querySelector('[data-role="pay-error"]').hidden = true;
}

// Called by renderCart(): keeps an open Review / Pay step in sync with the cart.
function refreshCheckout(type) {
  const state = checkout[type];
  if (!state.root) return;
  if (state.step === 3) renderCheckoutReview(type);
  if (state.step === 4) updatePayButtons(type);
}

// ---- Paying + confirmation ----

async function submitPayment(type, method) {
  const root = checkout[type].root;
  const errorEl = root.querySelector('[data-role="pay-error"]');
  errorEl.hidden = true;

  if (cart.items[type].length === 0) return;
  // Only checks the demo card fields are filled in; their values are never read.
  if (method === 'card' && !validateInputs(root.querySelector('[data-role="card-panel"]'))) return;

  const order = buildOrder(type);
  const payButtons = root.querySelectorAll('.checkout-pay-btn');
  const labels = [...payButtons].map(btn => btn.textContent);
  payButtons.forEach(btn => { btn.disabled = true; btn.textContent = 'Processing…'; });

  try {
    const result = method === 'card'
      ? await processCardPayment(order)
      : await processPayPalPayment(order);
    completeOrder(type, order, result.orderId, method);
  } catch (err) {
    errorEl.textContent = err.message || 'Payment could not be completed. Please try again.';
    errorEl.hidden = false;
    payButtons.forEach((btn, i) => { btn.disabled = false; btn.textContent = labels[i]; });
  }
}

function hideOrderConfirmation(type) {
  const box = byId(cart.ui[type].confirmation);
  if (box) box.hidden = true;
}

function completeOrder(type, order, orderId, method) {
  const ui = cart.ui[type];
  const box = byId(ui.confirmation);
  if (!box) return;

  const continueBtn = createEl('button', 'checkout-primary-btn', 'Continue shopping');
  continueBtn.type = 'button';
  continueBtn.addEventListener('click', () => {
    hideOrderConfirmation(type);
    const itemsLink = document.querySelector(ui.itemsLink);
    if (itemsLink) itemsLink.click();
  });

  box.textContent = '';
  box.append(
    createEl('h3', '', `Thank you, ${order.contact.name}!`),
    createEl('p', 'order-confirmation-id', `Order number: ${orderId}`),
    createEl('p', '', `Paid with ${method === 'card' ? 'card' : 'PayPal'} (demo). In a live store, a confirmation email would be sent to ${order.contact.email}.`),
    createReviewBlock('Order summary', createOrderLines(order)),
    createReviewBlock('Delivery', createDeliveryLines(order)),
    createEl('p', 'checkout-demo-note', 'This was a demo order. No payment was taken and nothing was saved.'),
    continueBtn
  );
  box.hidden = false;

  cart.items[type] = [];
  renderCart(type);        // empties the cart list and closes the checkout area
  buildCheckout(type);     // fresh wizard (clears everything typed, including demo card fields)
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- Setup ----

function buildCheckout(type) {
  const state = checkout[type];
  const root = byId(cart.ui[type].checkoutSection);
  if (!root) return;

  root.innerHTML = checkoutTemplate(type);
  Object.assign(state, { root, step: 1, delivery: 'pickup', payMethod: 'card' });

  const stepsList = root.querySelector('[data-role="steps"]');
  CHECKOUT_STEPS.forEach((label, i) => {
    const item = createEl('li', 'checkout-step');
    item.append(createEl('span', 'checkout-step-num', String(i + 1)), createEl('span', 'checkout-step-label', label));
    stepsList.appendChild(item);
  });

  root.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => { state.delivery = radio.value; setDeliveryUi(type); });
  });
  root.querySelectorAll('.checkout-method').forEach(btn => {
    btn.addEventListener('click', () => { state.payMethod = btn.dataset.method; setPayMethodUi(type); });
  });

  root.querySelector('[data-role="back"]').addEventListener('click', () => showCheckoutStep(type, state.step - 1));
  root.querySelector('[data-role="next"]').addEventListener('click', () => {
    if (validateCheckoutStep(type, state.step)) showCheckoutStep(type, state.step + 1);
  });
  root.querySelector('[data-role="card-pay"]').addEventListener('click', () => submitPayment(type, 'card'));
  root.querySelector('[data-role="paypal-pay"]').addEventListener('click', () => submitPayment(type, 'paypal'));

  showCheckoutStep(type, 1);
}

// Builds the wizard and wires the cart page's Checkout button to open it.
function setupCheckout(type) {
  const ui = cart.ui[type];
  const button = byId(ui.checkoutBtn);
  const section = byId(ui.checkoutSection);
  if (!button || !section) return;

  buildCheckout(type);

  button.addEventListener('click', () => {
    showCheckoutStep(type, 1);
    section.hidden = false;
    button.hidden = true;
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}


/* ---- 5.7 Month calendar (Popkern = plain, Deckcard = clickable events) -- */

// Builds the list of months from the current month through the last event.
function buildMonthRange(events) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  let last = new Date(start);
  events.forEach(ev => {
    const evDate = new Date(ev.year, ev.month, ev.day);
    if (evDate > last) last = evDate;
  });

  const months = [];
  const cursor = new Date(start);
  while (cursor <= last) {
    months.push({
      name: cursor.toLocaleString('default', { month: 'long', year: 'numeric' }),
      year: cursor.getFullYear(),
      monthIndex: cursor.getMonth()
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function createEmptyDayCell() {
  const cell = document.createElement('div');
  cell.className = 'cal-day empty-cell';
  cell.style.visibility = 'hidden';
  return cell;
}

// Popkern style: number only, event title as a hover tooltip.
function createPlainDayCell(dayNum, matchedEvents) {
  const cell = document.createElement('div');
  cell.className = 'cal-day';
  cell.textContent = dayNum;

  if (matchedEvents.length > 0) {
    cell.classList.add('has-event');
    cell.title = matchedEvents[0].title;
  }
  return cell;
}

// Deckcard style: number + event tags, click opens the event modal.
function createDeckcardDayCell(dayNum, matchedEvents, year, month) {
  const cell = document.createElement('div');
  cell.className = 'cal-day';

  const number = document.createElement('span');
  number.className = 'dc-day-number';
  number.textContent = dayNum;
  cell.appendChild(number);

  if (matchedEvents.length > 0) {
    cell.classList.add('has-event');

    matchedEvents.forEach(ev => {
      const tag = document.createElement('div');
      tag.className = 'dc-event-tag';
      tag.textContent = ev.title;
      cell.appendChild(tag);
    });

    const dateLabel = new Date(year, month, dayNum)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    cell.addEventListener('click', () => openDeckcardEventModal(dateLabel, matchedEvents));
  }
  return cell;
}

function setupCalendar({ prevId, nextId, labelId, gridId, events, isDeckcard = false, emptyText }) {
  const grid = byId(gridId);
  if (!grid) return;

  const prevBtn = byId(prevId);
  const nextBtn = byId(nextId);
  const label = byId(labelId);
  const months = buildMonthRange(events);
  let current = 0;

  function updateNavButtons() {
    if (prevBtn) prevBtn.style.visibility = current > 0 ? 'visible' : 'hidden';
    if (nextBtn) nextBtn.style.visibility = current < months.length - 1 ? 'visible' : 'hidden';
  }

  function render() {
    const { name, year, monthIndex: month } = months[current];
    label.textContent = name;
    grid.innerHTML = '';

    const leadingBlanks = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < leadingBlanks; i++) grid.appendChild(createEmptyDayCell());

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const matched = events.filter(e => e.year === year && e.month === month && e.day === dayNum);
      grid.appendChild(isDeckcard
        ? createDeckcardDayCell(dayNum, matched, year, month)
        : createPlainDayCell(dayNum, matched));
    }

    updateNavButtons();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (current > 0) { current--; render(); }
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (current < months.length - 1) { current++; render(); }
  });

  render();

  if (events.length === 0 && emptyText) {
    grid.insertAdjacentElement('afterend', createEmptyMessage(emptyText));
  }
}


/* ---- 5.8 Click-anywhere-to-close for the header dropdown menus ---------- */

function setupGlobalDropdownClose() {
  window.addEventListener('click', () => {
    closePopkernDropdown();
    closeThreeDreamDropdown();
  });
}


/* ==========================================================================
   6. POPKERN DEMO
   ========================================================================== */

/* ---- 6.1 Dropdown menu -------------------------------------------------- */

function setPopkernIcon(isExpanded) {
  const icon = byId('pk-menu-icon-img');
  if (!icon) return;
  icon.src = isExpanded ? POPKERN_ICON_EXPANDED : POPKERN_ICON_COLLAPSED;
  icon.alt = isExpanded ? '🍿 Popcorn' : '🌽 Corn Kernel';
}

function closePopkernDropdown() {
  const dropdown = byId('pk-menu-dropdown');
  if (!dropdown) return;
  dropdown.classList.remove('show');
  setPopkernIcon(false);
}

function setupPopkernMenu() {
  const menuBtn = byId('pk-menu-btn');
  const dropdown = byId('pk-menu-dropdown');
  if (!menuBtn || !dropdown || !byId('pk-menu-icon-img')) return;

  setPopkernIcon(false);

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    setPopkernIcon(dropdown.classList.toggle('show'));
  });

  dropdown.querySelectorAll('.popkern-nav-link')
    .forEach(link => link.addEventListener('click', closePopkernDropdown));
}


/* ---- 6.2 "Next market" banners ------------------------------------------ */

function renderPopkernEventBanners(events) {
  if (events.length === 0) {
    const emptyNote = '<p>No upcoming markets scheduled.</p>';
    const home = document.querySelector('#popkern-home .next-event-banner');
    const list = document.querySelector('#popkern-events .next-event-banner');
    if (home) home.innerHTML = `<h3>📍 Next Upcoming Market</h3>${emptyNote}`;
    if (list) list.innerHTML = `<h3>📍 Featured Upcoming Markets</h3>${emptyNote}`;
    return;
  }

  const homeBanner = document.querySelector('#popkern-home .next-event-banner');
  if (homeBanner) {
    const next = events[0];
    homeBanner.innerHTML = `
      <h3>📍 Next Upcoming Market</h3>
      <p><strong>${next.title}</strong> — ${next.formattedDate} | ${next.startTime} - ${next.endTime}</p>
    `;
  }

  const eventsBanner = document.querySelector('#popkern-events .next-event-banner');
  if (eventsBanner) {
    const rows = events.map((ev, i) =>
      `<p><strong>${i + 1}. ${ev.title}</strong> — ${ev.formattedDate} | ${ev.startTime} - ${ev.endTime}</p>`
    ).join('');
    eventsBanner.innerHTML = `<h3>📍 Featured Upcoming Markets</h3>${rows}`;
  }
}


/* ---- 6.3 Slideshow ------------------------------------------------------ */

const slideshow = {
  container: null,
  dotsContainer: null,
  prevBtn: null,
  nextBtn: null,
  slides: [],
  dots: [],
  index: 0,
  timer: null
};

function showSlide(n) {
  const { slides, dots } = slideshow;
  if (slides.length === 0) return;

  slideshow.index = (n + slides.length) % slides.length;

  slides.forEach(s => { s.style.display = 'none'; });
  dots.forEach(d => d.classList.remove('active'));

  slides[slideshow.index].style.display = 'block';
  if (dots[slideshow.index]) dots[slideshow.index].classList.add('active');
}

function autoPlaySlides() {
  showSlide(slideshow.index + 1);
  slideshow.timer = setTimeout(autoPlaySlides, SLIDE_INTERVAL_MS);
}

function resetSlideTimer() {
  clearTimeout(slideshow.timer);
  slideshow.timer = setTimeout(autoPlaySlides, SLIDE_INTERVAL_MS);
}

function createSlide(flavor) {
  const slide = document.createElement('div');
  slide.className = 'slide fade';

  const content = document.createElement('div');
  content.className = 'slide-content';

  const title = document.createElement('h3');
  title.className = 'slide-title-header';
  title.style.textAlign = 'center';
  title.style.marginBottom = '10px';
  title.style.fontWeight = 'bold';
  title.textContent = `- Featured Flavor -\n${flavor.name}`;
  content.appendChild(title);

  const img = document.createElement('img');
  img.src = resolveFlavorImageUrl(flavor);
  img.alt = `Featured Flavor: ${flavor.name}`;
  img.onerror = () => {
    img.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'slide-img-alt';
    placeholder.textContent = flavor.name.substring(0, 3).toUpperCase();
    content.appendChild(placeholder);
  };
  content.appendChild(img);

  slide.appendChild(content);
  return slide;
}

function buildSlideshow(flavors) {
  const { container, dotsContainer, prevBtn } = slideshow;
  if (!container) return;

  let featured = flavors.filter(f => f.is_featured);
  if (featured.length === 0) featured = flavors.slice(0, 3);

  container.querySelectorAll('.slide').forEach(s => s.remove());
  if (dotsContainer) dotsContainer.innerHTML = '';

  featured.forEach((flavor, idx) => {
    container.insertBefore(createSlide(flavor), prevBtn);

    if (dotsContainer) {
      const dot = document.createElement('span');
      dot.className = idx === 0 ? 'dot active' : 'dot';
      dot.addEventListener('click', () => {
        showSlide(idx);
        resetSlideTimer();
      });
      dotsContainer.appendChild(dot);
    }
  });

  slideshow.slides = container.querySelectorAll('.slide');
  if (dotsContainer) slideshow.dots = dotsContainer.querySelectorAll('.dot');

  if (slideshow.slides.length > 0) {
    showSlide(0);
    resetSlideTimer();
  }
}

function setupSlideshow(flavors) {
  slideshow.container     = document.querySelector('.slideshow-container');
  slideshow.dotsContainer = document.querySelector('.slide-dots');
  slideshow.prevBtn       = byId('pk-prev-slide');
  slideshow.nextBtn       = byId('pk-next-slide');

  buildSlideshow(flavors);

  if (slideshow.nextBtn) slideshow.nextBtn.addEventListener('click', () => {
    showSlide(slideshow.index + 1);
    resetSlideTimer();
  });
  if (slideshow.prevBtn) slideshow.prevBtn.addEventListener('click', () => {
    showSlide(slideshow.index - 1);
    resetSlideTimer();
  });
}


/* ---- 6.4 Flavors grid + detail modal ------------------------------------ */

function openFlavorModal(flavor, imageUrl) {
  byId('pk-modal-img').innerHTML = `<img src="${imageUrl}" alt="${flavor.name}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" onerror="this.onerror=null; this.parentElement.textContent='${flavor.name.substring(0, 3).toUpperCase()}';">`;
  byId('pk-modal-title').textContent = flavor.name;
  byId('pk-modal-desc').textContent = flavor.description;
  byId('popkern-modal').classList.remove('hidden');
}

function createFlavorCard(flavor) {
  const imageUrl = resolveFlavorImageUrl(flavor);

  const card = document.createElement('div');
  card.className = 'card';
  card.style.cursor = 'pointer';
  card.innerHTML = `
    <img src="${imageUrl}" alt="${flavor.name}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:10px;" onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className:'item-img-alt', style:'background:#FDE68A; color:#D97706;', textContent:'[ALT: ${flavor.name}]'}));">
    <h4 style="text-align:center;">${flavor.name}</h4>
  `;
  card.addEventListener('click', () => openFlavorModal(flavor, imageUrl));
  return card;
}

function setupFlavorsGrid(flavors) {
  const grid = byId('popkern-flavors-grid');
  if (!grid) return;

  grid.innerHTML = '';
  if (flavors.length === 0) {
    grid.appendChild(createEmptyMessage('No flavors available right now.'));
  } else {
    flavors.forEach(flavor => grid.appendChild(createFlavorCard(flavor)));
  }

  const closeBtn = byId('pk-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => byId('popkern-modal').classList.add('hidden'));
}


/* ==========================================================================
   7. 3DREAM DEMO
   ========================================================================== */

/* ---- 7.1 Dropdown menu -------------------------------------------------- */

function closeThreeDreamDropdown() {
  const dropdown = byId('td-menu-dropdown');
  if (dropdown) dropdown.classList.remove('show');
}

function setupThreeDreamMenu() {
  const menuBtn = byId('td-menu-btn');
  const dropdown = byId('td-menu-dropdown');
  if (!menuBtn || !dropdown) return;

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  dropdown.querySelectorAll('.td-nav-link')
    .forEach(link => link.addEventListener('click', closeThreeDreamDropdown));
}


/* ---- 7.2 Search (demo only: alerts, then jumps to the catalog) ---------- */

function setupThreeDreamSearch() {
  const btn = byId('td-search-btn');
  const input = byId('td-search-input');
  if (!btn || !input) return;

  const runSearch = () => {
    const query = input.value.trim();
    if (!query) return;

    alert(`Searching 3Dream catalog for: "${query}"`);
    const itemsLink = document.querySelector('.td-nav-link[data-page="items"]');
    if (itemsLink) itemsLink.click();
  };

  btn.addEventListener('click', runSearch);
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') runSearch();
  });
}


/* ---- 7.3 Catalog grid --------------------------------------------------- */

function createThreeDreamImage(item, imageUrl) {
  const placeholder = () => {
    const div = document.createElement('div');
    div.className = 'item-img-alt';
    div.textContent = `[ALT: ${item.name}]`;
    return div;
  };
  if (!imageUrl) return placeholder();

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = item.name;
  img.onerror = () => img.replaceWith(placeholder());
  return img;
}

function createThreeDreamCard(item) {
  const imageUrl = resolveThreeDreamImageUrl(item);
  const price = formatPrice(item.price);

  const card = document.createElement('div');
  card.className = 'td-card';
  card.style.cursor = 'pointer';

  const name = document.createElement('h4');
  name.textContent = item.name;

  card.appendChild(createThreeDreamImage(item, imageUrl));
  card.appendChild(name);

  if (price) {
    const priceEl = document.createElement('p');
    priceEl.className = 'td-price';
    priceEl.textContent = price;
    card.appendChild(priceEl);
  }

  card.addEventListener('click', () => openItemModal({
    name: item.name,
    description: item.description || 'No description available.',
    cartType: '3dream',
    imageUrl,
    price: item.price
  }));
  return card;
}

function setupThreeDreamCatalog(items) {
  const grid = byId('td-items-grid');
  if (!grid) return;

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.appendChild(createEmptyMessage('No items available right now.'));
  } else {
    items.forEach(item => grid.appendChild(createThreeDreamCard(item)));
  }
}


/* ---- 7.4 Business inquiry form ------------------------------------------ */

// Every field here must be filled in (spaces only counts as empty).
const INQUIRY_FIELD_IDS = ['td-inquiry-company', 'td-inquiry-details'];

// Back to the empty form (called every time the page is opened).
function resetInquiryForm() {
  const form = byId('td-inquiry-form');
  if (!form) return;

  form.reset();
  byId('td-inquiry-form-view').hidden = false;
  byId('td-inquiry-thanks').hidden = true;
}

function setupThreeDreamInquiryForm() {
  const form = byId('td-inquiry-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    for (const id of INQUIRY_FIELD_IDS) {
      const field = byId(id);
      if (field.value.trim() !== '') continue;

      const label = form.querySelector(`label[for="${id}"]`).textContent.trim();
      showToast(`${label} cannot be empty.`, field.getBoundingClientRect(), {
        variant: 'error', above: true, duration: 3000
      });
      field.focus();
      return;
    }

    // Demo: nothing is sent anywhere.
    hideToast();
    byId('td-inquiry-form-view').hidden = true;
    byId('td-inquiry-thanks').hidden = false;
  });
}


/* ==========================================================================
   8. DECKCARD DEMO
   ========================================================================== */

/* ---- 8.1 Inventory grid ------------------------------------------------- */

function createDeckcardItemCard(item) {
  const imageUrl = resolveDeckcardImageUrl(item);
  const placeholderStyle = 'background:#3F3F46; color:#A855F7;';

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${item.name}" style="width:100%; height:100px; object-fit:cover; border-radius:6px; margin-bottom:8px;" onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className:'item-img-alt', style:'${placeholderStyle}', textContent:'[ALT: ${item.name}]'}));">`
    : `<div class="item-img-alt" style="${placeholderStyle}">[ALT: ${item.name}]</div>`;

  const price = item.price ? Number(item.price).toFixed(2) : '0.00';

  const card = document.createElement('div');
  card.className = 'dc-card';
  card.style.cursor = 'pointer';
  card.innerHTML = `
    ${imageHtml}
    <h5 style="margin-top:4px;">${item.name}</h5>
    <p style="font-size:0.85rem; color:#A1A1AA; margin-top:2px;">$${price}</p>
  `;
  card.addEventListener('click', () => {
    openItemModal({
      name: item.name,
      description: item.description || item.desc || 'No description available.',
      cartType: 'deckcard',
      imageUrl,
      price: item.price,
      stock: toStock(item[DECKCARD_STOCK_COLUMN])
    });
  });
  return card;
}

function setupDeckcardInventory(items) {
  const grid = byId('dc-items-grid');
  if (!grid) return;

  grid.innerHTML = '';
  if (items.length === 0) {
    grid.appendChild(createEmptyMessage('No items available right now.'));
  } else {
    items.forEach(item => grid.appendChild(createDeckcardItemCard(item)));
  }
}


/* ---- 8.2 Account tabs --------------------------------------------------- */

function setupDeckcardTabs() {
  const tabButtons = document.querySelectorAll('.dc-tab-btn');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dc-tab-content').forEach(c => c.classList.remove('active-tab'));

      btn.classList.add('active');
      const tabContent = byId(btn.getAttribute('data-tab'));
      if (tabContent) tabContent.classList.add('active-tab');
    });
  });
}


/* ---- 8.3 Login toggle (demo only) --------------------------------------- */

function setupDeckcardLogin() {
  const loginBtn = byId('dc-login-toggle');
  if (!loginBtn) return;

  let isLoggedIn = false;
  loginBtn.addEventListener('click', e => {
    e.preventDefault();
    isLoggedIn = !isLoggedIn;
    loginBtn.textContent = isLoggedIn ? 'Logout' : 'Login';
    alert(isLoggedIn ? 'Logged in successfully!' : 'Logged out.');
  });
}


/* ---- 8.4 Event detail modal (opened from calendar day cells) ------------ */

function openDeckcardEventModal(dateLabel, events) {
  const modal = byId('deckcard-event-modal');
  if (!modal) return;

  const body = byId('dc-event-modal-body');
  byId('dc-event-modal-title').textContent = `Events on ${dateLabel}`;
  body.innerHTML = '';

  events.forEach(ev => {
    const row = document.createElement('div');
    row.className = 'dc-modal-event-item';
    row.innerHTML = `
      <h4 style="color:#A855F7; margin-bottom:4px;">${ev.title}</h4>
      <p style="font-size:0.85rem; color:#4B5563; margin-bottom:4px;"><strong>Time:</strong> ${ev.time || 'TBD'}</p>
      <p style="font-size:0.9rem; color:#1F2937;">${ev.description || 'No additional details provided.'}</p>
    `;
    body.appendChild(row);
  });

  modal.classList.remove('hidden');
}

function setupDeckcardEventModal() {
  const closeBtn = byId('dc-event-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => byId('deckcard-event-modal').classList.add('hidden'));
}


/* ==========================================================================
   9. INIT
   Order: wire up everything that needs no data -> fetch all data in
   parallel -> render the data-driven parts.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

  // --- Static UI (no data needed) ---
  loadLogos();
  setupDemoSwitcher();
  setupAllSubpageNavs();
  setupModalDismissal();
  setupItemModal();
  setupCheckout('3dream');
  setupCheckout('deckcard');
  renderCart('3dream');
  renderCart('deckcard');

  setupPopkernMenu();
  setupThreeDreamMenu();
  setupThreeDreamSearch();
  setupThreeDreamInquiryForm();
  setupGlobalDropdownClose();

  setupDeckcardTabs();
  setupDeckcardLogin();
  setupDeckcardEventModal();

  // --- Data (all five requests run at once) ---
  const [popkernEvents, flavors, deckcardItems, deckcardEvents, threedreamItems] = await Promise.all([
    loadPopkernEvents(),
    loadPopkernFlavors(),
    loadDeckcardInventory(),
    loadDeckcardEvents(),
    loadThreeDreamItems()
  ]);

  // --- Data-driven UI ---
  renderPopkernEventBanners(popkernEvents);
  setupSlideshow(flavors);
  setupFlavorsGrid(flavors);
  setupDeckcardInventory(deckcardItems);
  setupThreeDreamCatalog(threedreamItems);

  setupCalendar({
    prevId: 'pk-prev-month', nextId: 'pk-next-month',
    labelId: 'pk-month-label', gridId: 'pk-calendar',
    events: popkernEvents, isDeckcard: false,
    emptyText: 'No upcoming markets scheduled.'
  });
  setupCalendar({
    prevId: 'dc-prev-month', nextId: 'dc-next-month',
    labelId: 'dc-month-label', gridId: 'dc-calendar',
    events: deckcardEvents, isDeckcard: true,
    emptyText: 'No upcoming events scheduled.'
  });
});
