/* ==========================================================================
   WebdevV — app.js
   --------------------------------------------------------------------------
   TABLE OF CONTENTS
     1. Configuration ................ Supabase + storage bucket URLs, timings
     2. Static data .................. Popkern menu icons
     3. Supabase client & data layer . every network call lives here
     4. Small helpers ................ DOM + URL helpers used everywhere
     5. Shared UI .................... logos, demo switcher, sub-page nav,
                                       modals, item modal + cart, calendar
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
      if (activeWrapper) activeWrapper.classList.add('active-demo');
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

function setupSubpageNav(navSelector, pageClass) {
  document.querySelectorAll(navSelector).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const pageId = link.getAttribute('data-page');
      const demo = link.closest('.demo-wrapper');

      demo.querySelectorAll(navSelector).forEach(l => l.classList.remove('active'));
      demo.querySelectorAll(`.${pageClass}`).forEach(p => p.classList.remove('active-subpage'));

      const activeLink = demo.querySelector(
        `nav a[data-page="${pageId}"], .pk-dropdown-content a[data-page="${pageId}"]`
      );
      if (activeLink) activeLink.classList.add('active');

      const targetPage = demo.querySelector(`[id$="-${pageId}"]`);
      if (targetPage) targetPage.classList.add('active-subpage');
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


/* ---- 5.5 Generic item modal + cart counters (3Dream & Deckcard) --------- */

const cart = {
  activeType: null,                       // which demo opened the modal
  counts: { '3dream': 0, deckcard: 0 },
  badgeSelector: { '3dream': '.td-cart-count', deckcard: '.dc-cart-count' }
};

// Opens the shared item modal. imageUrl and price are optional.
function openItemModal({ name, description, cartType, imageUrl = null, price = '' }) {
  cart.activeType = cartType;

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

  const priceEl = byId('gen-modal-price');
  if (priceEl) {
    priceEl.textContent = price;
    priceEl.hidden = !price;
  }

  byId('gen-modal-title').textContent = name;
  byId('gen-modal-desc').textContent = description;
  byId('generic-item-modal').classList.remove('hidden');
}

function setupItemModal() {
  const modal = byId('generic-item-modal');
  const addBtn = byId('gen-modal-add');
  const closeBtn = byId('gen-modal-close');

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const type = cart.activeType;
      if (type in cart.counts) {
        cart.counts[type]++;
        document.querySelectorAll(cart.badgeSelector[type])
          .forEach(badge => { badge.textContent = cart.counts[type]; });
      }
      modal.classList.add('hidden');
      alert('Item added to cart!');
    });
  }
}


/* ---- 5.6 Month calendar (Popkern = plain, Deckcard = clickable events) -- */

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


/* ---- 5.7 Click-anywhere-to-close for the header dropdown menus ---------- */

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
    price
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
      cartType: 'deckcard'
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

  setupPopkernMenu();
  setupThreeDreamMenu();
  setupThreeDreamSearch();
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
