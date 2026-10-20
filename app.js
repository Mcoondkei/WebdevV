document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. DEMO SWITCHER LOGIC (templates.html)
  // ==========================================
  const demoButtons = document.querySelectorAll('.demo-btn');
  const demoWrappers = document.querySelectorAll('.demo-wrapper');

  if (demoButtons.length > 0) {
    demoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        
        demoButtons.forEach(b => b.classList.remove('active'));
        demoWrappers.forEach(w => w.classList.remove('active-demo'));

        btn.classList.add('active');
        const activeWrapper = document.getElementById(`demo-${target}`);
        if (activeWrapper) activeWrapper.classList.add('active-demo');
      });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const requestedDemo = urlParams.get('demo');
    if (requestedDemo) {
      const matchBtn = document.querySelector(`.demo-btn[data-target="${requestedDemo}"]`);
      if (matchBtn) matchBtn.click();
    }
  }

  // Generic Subpage Navigation Helper (Handles links & logo clicks)
  function setupSubpageNav(navSelector, pageClass) {
    const navLinks = document.querySelectorAll(navSelector);
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        const parentDemo = link.closest('.demo-wrapper');

        parentDemo.querySelectorAll(navSelector).forEach(l => l.classList.remove('active'));
        parentDemo.querySelectorAll(`.${pageClass}`).forEach(p => p.classList.remove('active-subpage'));

        const activeNavLink = parentDemo.querySelector(`nav a[data-page="${pageId}"], .pk-dropdown-content a[data-page="${pageId}"]`);
        if (activeNavLink) activeNavLink.classList.add('active');

        const targetPage = parentDemo.querySelector(`[id$="-${pageId}"]`);
        if (targetPage) targetPage.classList.add('active-subpage');
      });
    });
  }

  setupSubpageNav('.popkern-nav-link', 'popkern-page');
  setupSubpageNav('.td-nav-link', 'td-page');
  setupSubpageNav('.dc-nav-link', 'dc-page');
  setupSubpageNav('.dt-nav-link', 'dt-page');


  // ==========================================
  // 2. POPKERN DROPDOWN MENU & IMAGE ICON TOGGLE
  // ==========================================
  const pkMenuBtn = document.getElementById('pk-menu-btn');
  const pkDropdown = document.getElementById('pk-menu-dropdown');
  const pkMenuIconImg = document.getElementById('pk-menu-icon-img');

  const kernelImgSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌽</text></svg>';
  const popcornImgSrc = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍿</text></svg>';

  function setPopkernIcon(isExpanded) {
    if (!pkMenuIconImg) return;
    if (isExpanded) {
      pkMenuIconImg.src = popcornImgSrc;
      pkMenuIconImg.alt = '🍿 Popcorn';
    } else {
      pkMenuIconImg.src = kernelImgSrc;
      pkMenuIconImg.alt = '🌽 Corn Kernel';
    }
  }

  function closePopkernDropdown() {
    if (pkDropdown) {
      pkDropdown.classList.remove('show');
      setPopkernIcon(false);
    }
  }

  if (pkMenuBtn && pkDropdown && pkMenuIconImg) {
    setPopkernIcon(false);

    pkMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = pkDropdown.classList.toggle('show');
      setPopkernIcon(isExpanded);
    });

    pkDropdown.querySelectorAll('.popkern-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        closePopkernDropdown();
      });
    });
  }


  // ==========================================
  // 3. 3DREAM DROPDOWN MENU & SEARCH LOGIC
  // ==========================================
  const tdMenuBtn = document.getElementById('td-menu-btn');
  const tdDropdown = document.getElementById('td-menu-dropdown');

  if (tdMenuBtn && tdDropdown) {
    tdMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tdDropdown.classList.toggle('show');
    });

    tdDropdown.querySelectorAll('.td-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        tdDropdown.classList.remove('show');
      });
    });
  }

  window.addEventListener('click', () => {
    closePopkernDropdown();
    if (tdDropdown) tdDropdown.classList.remove('show');
  });

  const tdSearchBtn = document.getElementById('td-search-btn');
  const tdSearchInput = document.getElementById('td-search-input');

  if (tdSearchBtn && tdSearchInput) {
    const handleSearch = () => {
      const query = tdSearchInput.value.trim();
      if (query) {
        alert(`Searching 3Dream catalog for: "${query}"`);
        const itemsLink = document.querySelector('.td-nav-link[data-page="items"]');
        if (itemsLink) itemsLink.click();
      }
    };

    tdSearchBtn.addEventListener('click', handleSearch);
    tdSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }


  // ==========================================
  // 4. POPKERN SLIDESHOW WITH NEXT/PREV CONTROLS
  // ==========================================
  let slideIndex = 0;
  const slides = document.querySelectorAll('.slideshow-container .slide');
  const dots = document.querySelectorAll('.slide-dots .dot');
  const prevSlideBtn = document.getElementById('pk-prev-slide');
  const nextSlideBtn = document.getElementById('pk-next-slide');
  let slideTimer = null;

  function showSlide(n) {
    if (slides.length === 0) return;
    if (n >= slides.length) slideIndex = 0;
    if (n < 0) slideIndex = slides.length - 1;

    slides.forEach(s => s.style.display = 'none');
    dots.forEach(d => d.classList.remove('active'));

    slides[slideIndex].style.display = 'block';
    if (dots[slideIndex]) dots[slideIndex].classList.add('active');
  }

  function autoPlaySlides() {
    slideIndex++;
    showSlide(slideIndex);
    slideTimer = setTimeout(autoPlaySlides, 5000);
  }

  function resetTimer() {
    clearTimeout(slideTimer);
    slideTimer = setTimeout(autoPlaySlides, 5000);
  }

  if (slides.length > 0) {
    showSlide(slideIndex);
    slideTimer = setTimeout(autoPlaySlides, 5000);

    if (nextSlideBtn) {
      nextSlideBtn.addEventListener('click', () => {
        slideIndex++;
        showSlide(slideIndex);
        resetTimer();
      });
    }

    if (prevSlideBtn) {
      prevSlideBtn.addEventListener('click', () => {
        slideIndex--;
        showSlide(slideIndex);
        resetTimer();
      });
    }
  }

  // Popkern Flavors Data
  const popkernFlavors = [
    { name: 'Apple Cinnamon', desc: 'Crisp apple flavor infused with warm aromatic cinnamon glaze.' },
    { name: 'Cheddar Jalapeno', desc: 'Sharp cheddar cheese blended with a fiery jalapeño kick.' },
    { name: 'Churro', desc: 'Sweet cinnamon sugar coating layered over buttery kettle corn.' },
    { name: 'Chocolate', desc: 'Rich dark chocolate drizzle over crisp caramelized popcorn.' },
    { name: 'Cheddar', desc: 'Classic real Wisconsin cheddar cheese coating.' },
    { name: 'Dill Pickle', desc: 'Tangy, savory dill pickle seasoning with garlic hints.' }
  ];

  const pkGrid = document.getElementById('popkern-flavors-grid');
  const pkModal = document.getElementById('popkern-modal');
  const pkModalImg = document.getElementById('pk-modal-img');
  const pkModalTitle = document.getElementById('pk-modal-title');
  const pkModalDesc = document.getElementById('pk-modal-desc');
  const pkModalClose = document.getElementById('pk-modal-close');

  if (pkGrid) {
    popkernFlavors.forEach(flavor => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="item-img-alt" style="background:#FDE68A; color:#D97706;">[ALT: ${flavor.name}]</div>
        <h4 style="text-align:center;">${flavor.name}</h4>
      `;
      card.addEventListener('click', () => {
        pkModalImg.textContent = flavor.name.substring(0, 3).toUpperCase();
        pkModalTitle.textContent = flavor.name;
        pkModalDesc.textContent = flavor.desc;
        pkModal.classList.remove('hidden');
      });
      pkGrid.appendChild(card);
    });
  }

  if (pkModalClose) {
    pkModalClose.addEventListener('click', () => pkModal.classList.add('hidden'));
  }


  // ==========================================
  // 5. GENERIC MODAL & CART (3Dream & Deckcard)
  // ==========================================
  const genModal = document.getElementById('generic-item-modal');
  const genModalImg = document.getElementById('gen-modal-img');
  const genModalTitle = document.getElementById('gen-modal-title');
  const genModalDesc = document.getElementById('gen-modal-desc');
  const genModalAdd = document.getElementById('gen-modal-add');
  const genModalClose = document.getElementById('gen-modal-close');

  let activeCartType = null;
  let tdCartCount = 0;
  let dcCartCount = 0;

  function openGenericModal(name, desc, type) {
    activeCartType = type;
    genModalImg.textContent = `[ALT Image: ${name}]`;
    genModalTitle.textContent = name;
    genModalDesc.textContent = desc;
    genModal.classList.remove('hidden');
  }

  if (genModalClose) {
    genModalClose.addEventListener('click', () => genModal.classList.add('hidden'));
  }

  if (genModalAdd) {
    genModalAdd.addEventListener('click', () => {
      if (activeCartType === '3dream') {
        tdCartCount++;
        document.querySelectorAll('.td-cart-count').forEach(e => e.textContent = tdCartCount);
      } else if (activeCartType === 'deckcard') {
        dcCartCount++;
        document.querySelectorAll('.dc-cart-count').forEach(e => e.textContent = dcCartCount);
      }
      genModal.classList.add('hidden');
      alert('Item added to cart!');
    });
  }

  const tdItems = [
    { name: 'Spoon', desc: 'Ergonomic heat-resistant 3D printed utensil.' },
    { name: 'Fork', desc: 'Durable reinforced fork engineered for modern table setups.' },
    { name: 'Chopsticks', desc: 'Precision lightweight textured chopsticks.' },
    { name: 'Bowl', desc: 'Eco-friendly food-safe printed serving bowl.' },
    { name: 'Plate', desc: 'Minimalist geometric dinner plate design.' },
    { name: 'Cup', desc: 'Double-walled insulated beverage container.' }
  ];

  const tdGrid = document.getElementById('td-items-grid');
  if (tdGrid) {
    tdItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'td-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="item-img-alt">[ALT: ${item.name}]</div>
        <h4>${item.name}</h4>
      `;
      card.addEventListener('click', () => openGenericModal(item.name, item.desc, '3dream'));
      tdGrid.appendChild(card);
    });
  }

  const dcItems = [
    { name: 'Pack of Cards #1', desc: 'Pack of Cards #1' },
    { name: 'Pack of Cards #2', desc: 'Pack of Cards #2' },
    { name: 'Card 1', desc: 'Card 1' },
    { name: 'Card 2', desc: 'Card 2' },
    { name: 'Card 3', desc: 'Card 3' },
    { name: 'Card 4', desc: 'Card 4' },
    { name: 'Card 5', desc: 'Card 5' }
  ];

  const dcGrid = document.getElementById('dc-items-grid');
  if (dcGrid) {
    dcItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dc-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="item-img-alt" style="background:#3F3F46; color:#A855F7;">[ALT: ${item.name}]</div>
        <h5>${item.name}</h5>
      `;
      card.addEventListener('click', () => openGenericModal(item.name, item.desc, 'deckcard'));
      dcGrid.appendChild(card);
    });
  }

  const dcTabBtns = document.querySelectorAll('.dc-tab-btn');
  dcTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      dcTabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dc-tab-content').forEach(c => c.classList.remove('active-tab'));

      btn.classList.add('active');
      const activeTabContent = document.getElementById(targetTab);
      if (activeTabContent) activeTabContent.classList.add('active-tab');
    });
  });

  const dcLoginBtn = document.getElementById('dc-login-toggle');
  let isLoggedIn = false;
  if (dcLoginBtn) {
    dcLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isLoggedIn = !isLoggedIn;
      dcLoginBtn.textContent = isLoggedIn ? 'Logout' : 'Login';
      alert(isLoggedIn ? 'Logged in successfully!' : 'Logged out.');
    });
  }


  // ==========================================
  // 6. REAL-WORLD DYNAMIC CALENDAR SYSTEM
  // ==========================================
  const calendarDates = [
    { year: 2026, month: 10, day: 7, title: 'Downtown Farmers Market' },   // November 7, 2026
    { year: 2026, month: 10, day: 14, title: 'Holiday Craft Bazaar' },     // November 14, 2026
    { year: 2026, month: 10, day: 20, title: 'Winter Artisan Showcase' }   // November 20, 2026
  ];

  const deckcardDates = [
    { year: 2026, month: 10, day: 7, title: 'Tournament Event' },
    { year: 2026, month: 10, day: 18, title: 'Tournament Event' },
    { year: 2026, month: 10, day: 24, title: 'Tournament Event' }
  ];

  // Automatically generates current month + upcoming 3 months dynamically
  function generateUpcomingMonths(numMonths = 4) {
    const monthsList = [];
    const currentDate = new Date();
    
    for (let i = 0; i < numMonths; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const monthIndex = targetDate.getMonth();
      const name = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      monthsList.push({ name, year, monthIndex });
    }
    
    return monthsList;
  }

  const calendarMonths = generateUpcomingMonths(4);

  function setupRealCalendar(prevId, nextId, labelId, gridId, eventList) {
    let currentMonthIdx = 0;
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const label = document.getElementById(labelId);
    const grid = document.getElementById(gridId);

    if (!grid) return;

    function renderCal() {
      const targetMonthObj = calendarMonths[currentMonthIdx];
      label.textContent = targetMonthObj.name;
      grid.innerHTML = '';

      const year = targetMonthObj.year;
      const month = targetMonthObj.monthIndex;

      // Get the first day of the month and total days using real JS Date objects
      const firstDayIndex = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();

      // Render blank offset cells for days before the 1st of the month
      for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty-cell';
        emptyCell.style.visibility = 'hidden';
        grid.appendChild(emptyCell);
      }

      // Render actual days of the month
      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        dayCell.textContent = dayNum;

        // Check if this specific date matches any scheduled events
        const matchedEvent = eventList.find(e => e.year === year && e.month === month && e.day === dayNum);
        if (matchedEvent) {
          dayCell.classList.add('has-event');
          dayCell.title = matchedEvent.title;
        }

        grid.appendChild(dayCell);
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentMonthIdx > 0) {
          currentMonthIdx--;
          renderCal();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentMonthIdx < calendarMonths.length - 1) {
          currentMonthIdx++;
          renderCal();
        }
      });
    }

    renderCal();
  }

  setupRealCalendar('pk-prev-month', 'pk-next-month', 'pk-month-label', 'pk-calendar', calendarDates);
  setupRealCalendar('dc-prev-month', 'dc-next-month', 'dc-month-label', 'dc-calendar', deckcardDates);

});