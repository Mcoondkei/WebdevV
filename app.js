document.addEventListener('DOMContentLoaded', async () => {

  // ==========================================
  // 0. SUPABASE CLIENT & BUCKETS CONFIG
  // ==========================================
  const SUPABASE_URL = 'https://pcxudiubzqezdwjwvjfx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHVkaXVienFlemR3and2amZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NTQ1MjYsImV4cCI6MjEwODAzMDUyNn0.kOBtiuhquRmvPr3yTMTB0g6cpwj50PhjMNVlkel3jAE';
  let supabaseClient = null;

  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Storage Bucket URLs
  const LOGOS_BUCKET_URL = `${SUPABASE_URL}/storage/v1/object/public/logos`;
  const POPKERN_IMAGES_BUCKET_URL = `${SUPABASE_URL}/storage/v1/object/public/popkern_images`;

  // Dynamic Logo Loader (webdevv_logo.jpg and popkern_logo.jpg)
  function loadLogos() {
    const agencyLogoImgs = document.querySelectorAll('.agency-logo-img');
    agencyLogoImgs.forEach(img => {
      img.src = `${LOGOS_BUCKET_URL}/webdevv_logo.png`;
      img.alt = 'WebdevV Agency Logo';
      img.onerror = () => { img.alt = '⚡ WebdevV'; };
    });

    const popkernLogoImgs = document.querySelectorAll('#demo-popkern .demo-logo-img');
    popkernLogoImgs.forEach(img => {
      img.src = `${LOGOS_BUCKET_URL}/popkern_logo.png`;
      img.alt = '🍿 Popkern Logo';
      img.onerror = () => { img.alt = '🍿 Popkern'; };
    });
  }

  loadLogos();

  // ==========================================
  // LIVE EVENT FETCH FROM SUPABASE
  // ==========================================
  let calendarDates = [];

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('popkern_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        calendarDates = data.map(event => {
          const d = new Date(event.event_date + 'T00:00:00');
          return {
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            title: event.title,
            startTime: event.start_time || '9:00 AM',
            endTime: event.end_time || '5:00 PM',
            formattedDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          };
        });
      }
    } catch (err) {
      console.error('Error fetching events from Supabase:', err.message);
    }
  }

  if (calendarDates.length > 0) {
    const nextEvent = calendarDates[0];
    const homeBanner = document.querySelector('#popkern-home .next-event-banner');
    if (homeBanner) {
      homeBanner.innerHTML = `
        <h3>📍 Next Upcoming Market</h3>
        <p><strong>${nextEvent.title}</strong> — ${nextEvent.formattedDate} | ${nextEvent.startTime} - ${nextEvent.endTime}</p>
      `;
    }

    const eventsPageBanner = document.querySelector('#popkern-events .next-event-banner');
    if (eventsPageBanner) {
      let listHTML = '<h3>📍 Featured Upcoming Markets</h3>';
      calendarDates.forEach((ev, idx) => {
        listHTML += `<p><strong>${idx + 1}. ${ev.title}</strong> — ${ev.formattedDate} | ${ev.startTime} - ${ev.endTime}</p>`;
      });
      eventsPageBanner.innerHTML = listHTML;
    }
  }

  // ==========================================
  // 1. DEMO SWITCHER LOGIC
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

  // 3Dream Menu & Search
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
  // SHARED FLAVORS & POPKERN_IMAGES BUCKET DATA
  // ==========================================
  let sharedFlavors = [];

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('popkern_flavors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        sharedFlavors = data;
      }
    } catch (err) {
      console.warn('Could not fetch popkern_flavors, using fallback data:', err.message);
    }
  }

  function resolveFlavorImageUrl(flavor) {
    if (flavor.image_url && flavor.image_url.startsWith('http')) {
      return flavor.image_url;
    }
    const filename = flavor.image_filename || flavor.image_url || `${flavor.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    return `${POPKERN_IMAGES_BUCKET_URL}/${filename}`;
  }

  // Slideshow
  const slideshowContainer = document.querySelector('.slideshow-container');
  const slideDotsContainer = document.querySelector('.slide-dots');
  const prevSlideBtn = document.getElementById('pk-prev-slide');
  const nextSlideBtn = document.getElementById('pk-next-slide');

  let slideIndex = 0;
  let slideTimer = null;
  let activeSlides = [];
  let activeDots = [];

  function showSlide(n) {
    if (activeSlides.length === 0) return;
    if (n >= activeSlides.length) slideIndex = 0;
    if (n < 0) slideIndex = activeSlides.length - 1;

    activeSlides.forEach(s => s.style.display = 'none');
    activeDots.forEach(d => d.classList.remove('active'));

    activeSlides[slideIndex].style.display = 'block';
    if (activeDots[slideIndex]) activeDots[slideIndex].classList.add('active');
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

  function loadSlideshow() {
    if (!slideshowContainer) return;

    let featuredFlavors = sharedFlavors.filter(f => f.is_featured);
    if (featuredFlavors.length === 0) {
      featuredFlavors = sharedFlavors.slice(0, 3);
    }

    slideshowContainer.querySelectorAll('.slide').forEach(s => s.remove());
    if (slideDotsContainer) slideDotsContainer.innerHTML = '';

    featuredFlavors.forEach((flavor, idx) => {
      const slideDiv = document.createElement('div');
      slideDiv.className = 'slide fade';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'slide-content';

      const headerTitle = document.createElement('h3');
      headerTitle.className = 'slide-title-header';
      headerTitle.style.textAlign = 'center';
      headerTitle.style.marginBottom = '10px';
      headerTitle.style.fontWeight = 'bold';
      headerTitle.textContent = `- Featured Flavor -\n${flavor.name}`;
      contentDiv.appendChild(headerTitle);

      const imageUrl = resolveFlavorImageUrl(flavor);
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Featured Flavor: ${flavor.name}`;
      img.onerror = () => {
        img.style.display = 'none';
        const altDiv = document.createElement('div');
        altDiv.className = 'slide-img-alt';
        altDiv.textContent = flavor.name.substring(0, 3).toUpperCase();
        contentDiv.appendChild(altDiv);
      };

      contentDiv.appendChild(img);
      slideDiv.appendChild(contentDiv);
      slideshowContainer.insertBefore(slideDiv, prevSlideBtn);

      if (slideDotsContainer) {
        const dot = document.createElement('span');
        dot.className = idx === 0 ? 'dot active' : 'dot';
        dot.addEventListener('click', () => {
          slideIndex = idx;
          showSlide(slideIndex);
          resetTimer();
        });
        slideDotsContainer.appendChild(dot);
      }
    });

    activeSlides = slideshowContainer.querySelectorAll('.slide');
    if (slideDotsContainer) {
      activeDots = slideDotsContainer.querySelectorAll('.dot');
    }

    if (activeSlides.length > 0) {
      showSlide(0);
      resetTimer();
    }
  }

  loadSlideshow();

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

  // Flavors Grid
  const pkGrid = document.getElementById('popkern-flavors-grid');
  const pkModal = document.getElementById('popkern-modal');
  const pkModalImg = document.getElementById('pk-modal-img');
  const pkModalTitle = document.getElementById('pk-modal-title');
  const pkModalDesc = document.getElementById('pk-modal-desc');
  const pkModalClose = document.getElementById('pk-modal-close');

  function loadFlavorsGrid() {
    if (!pkGrid) return;
    pkGrid.innerHTML = '';

    sharedFlavors.forEach(flavor => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';

      const imageUrl = resolveFlavorImageUrl(flavor);

      card.innerHTML = `
        <img src="${imageUrl}" alt="${flavor.name}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:10px;" onerror="this.onerror=null; this.replaceWith(Object.assign(document.createElement('div'), {className:'item-img-alt', style:'background:#FDE68A; color:#D97706;', textContent:'[ALT: ${flavor.name}]'}));">
        <h4 style="text-align:center;">${flavor.name}</h4>
      `;

      card.addEventListener('click', () => {
        pkModalImg.innerHTML = `<img src="${imageUrl}" alt="${flavor.name}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" onerror="this.onerror=null; this.parentElement.textContent='${flavor.name.substring(0, 3).toUpperCase()}';">`;
        pkModalTitle.textContent = flavor.name;
        pkModalDesc.textContent = flavor.description;
        pkModal.classList.remove('hidden');
      });

      pkGrid.appendChild(card);
    });
  }

  loadFlavorsGrid();

  if (pkModalClose) {
    pkModalClose.addEventListener('click', () => pkModal.classList.add('hidden'));
  }

  // Generic Modals & Cart Logic
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

  // Real-World Dynamic Calendar System
  const deckcardDates = [
    { year: 2026, month: 10, day: 7, title: 'Tournament Event' },
    { year: 2026, month: 10, day: 18, title: 'Tournament Event' },
    { year: 2026, month: 10, day: 24, title: 'Tournament Event' }
  ];

  function generateDynamicMonthsRange(events) {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let maxTargetDate = new Date(startDate);

    if (events && events.length > 0) {
      events.forEach(ev => {
        const evDate = new Date(ev.year, ev.month, ev.day);
        if (evDate > maxTargetDate) {
          maxTargetDate = evDate;
        }
      });
    }

    const monthsList = [];
    let iterDate = new Date(startDate);

    while (iterDate <= maxTargetDate) {
      const year = iterDate.getFullYear();
      const monthIndex = iterDate.getMonth();
      const name = iterDate.toLocaleString('default', { month: 'long', year: 'numeric' });

      monthsList.push({ name, year, monthIndex });
      iterDate.setMonth(iterDate.getMonth() + 1);
    }

    return monthsList;
  }

  function setupRealCalendar(prevId, nextId, labelId, gridId, eventList) {
    let currentMonthIdx = 0;
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const label = document.getElementById(labelId);
    const grid = document.getElementById(gridId);

    if (!grid) return;

    const calendarMonths = generateDynamicMonthsRange(eventList);

    // Hide Prev only on the first month (current real month) and
    // Next only on the last month that has an event. Gap months show both.
    // visibility (not display) keeps the controls row layout from shifting.
    function updateNavButtons() {
      if (prevBtn) prevBtn.style.visibility = currentMonthIdx > 0 ? 'visible' : 'hidden';
      if (nextBtn) nextBtn.style.visibility = currentMonthIdx < calendarMonths.length - 1 ? 'visible' : 'hidden';
    }

    function renderCal() {
      const targetMonthObj = calendarMonths[currentMonthIdx];
      label.textContent = targetMonthObj.name;
      grid.innerHTML = '';

      const year = targetMonthObj.year;
      const month = targetMonthObj.monthIndex;

      const firstDayIndex = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty-cell';
        emptyCell.style.visibility = 'hidden';
        grid.appendChild(emptyCell);
      }

      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        dayCell.textContent = dayNum;

        const matchedEvent = eventList.find(e => e.year === year && e.month === month && e.day === dayNum);
        if (matchedEvent) {
          dayCell.classList.add('has-event');
          dayCell.title = matchedEvent.title;
        }

        grid.appendChild(dayCell);
      }

      updateNavButtons();
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