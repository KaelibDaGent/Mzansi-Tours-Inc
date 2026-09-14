// ==========================================
// 1. SUPABASE AUTHENTICATION GUARD
// ==========================================
const SUPABASE_URL = 'https://jotbhavmyqqedhjcudwo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_B1rJj0WN5I1vDEi6MoFyMw_-VFxZ09V';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        showTeaserOverlay();
        return;
    }

    // Business owners and admins don't belong on the tourist dashboard.
    // Role values must match the Postgres enum exactly: tourist / business / admin
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile && profile.role === 'business_owner') {
        window.location.href = 'business-dashboard.html';
        return;
    }
    if (profile && profile.role === 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    showAuthenticatedUI(session.user);
}

function showTeaserOverlay() {
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');

    const loginLink = document.getElementById('navLogin');
    const signupLink = document.getElementById('navSignup');
    if (loginLink) loginLink.style.display = 'block';
    if (signupLink) signupLink.style.display = 'block';

    const existingBanner = document.getElementById('authBanner');
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'authBanner';
    banner.style.cssText = `
        background: var(--sa-blue); color: white;
        padding: 0.8rem 1.5rem; text-align: center;
        font-size: 0.9rem; font-weight: 600;
        display: flex; align-items: center; justify-content: center;
        gap: 1rem; flex-wrap: wrap;
        position: relative; z-index: 100;
    `;
    banner.innerHTML = `
        <span><i class="fa-solid fa-circle-info"></i> Browsing as a guest — log in to save events to your itinerary.</span>
        <a href="login.html" style="background: #EAAA00; color: #002244; padding: 0.4rem 1.2rem; border-radius: 50px; font-weight: 700; text-decoration: none;">Log In</a>
        <a href="signup.html" style="background: transparent; border: 2px solid #EAAA00; color: #EAAA00; padding: 0.35rem 1.1rem; border-radius: 50px; font-weight: 700; text-decoration: none;">Sign Up</a>
        <button id="dismissAuthBanner" style="background: none; border: none; color: white; font-size: 1.1rem; cursor: pointer; opacity: 0.7;">&times;</button>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById('dismissAuthBanner').addEventListener('click', () => {
        banner.remove();
    });
}

// ==========================================
// PRICE FILTERING LOGIC
// ==========================================
let selectedPriceRanges = new Set();

// Helper: Parse price string to a number (e.g., "Free" -> 0, "R150" -> 150)
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const lower = priceStr.toString().toLowerCase();
    if (lower.includes('free')) return 0;
    
    // Extract the first number found (e.g., "R150" -> 150, "R 500" -> 500)
    const match = lower.match(/r?\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

// Helper: Check if an event's price matches the selected price filters
function matchesPriceFilter(eventPrice, selectedPrices) {
    if (selectedPrices.size === 0) return true; // No price filters applied, show all
    
    const priceVal = parsePrice(eventPrice);
    
    for (const filter of selectedPrices) {
        if (filter === 'free' && priceVal === 0) return true;
        if (filter === 'under200' && priceVal > 0 && priceVal < 200) return true;
        if (filter === '200to500' && priceVal >= 200 && priceVal <= 500) return true;
        if (filter === 'over500' && priceVal > 500) return true;
    }
    return false;
}

// Filter function: Takes an array of events and returns only those matching price filters
function filterEventsByPrice(events) {
    return events.filter(event => matchesPriceFilter(event.price, selectedPriceRanges));
}

// Event Listeners for Price Checkboxes
document.querySelectorAll('.price-filter').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        // Update the Set based on checkbox state
        if (e.target.checked) {
            selectedPriceRanges.add(e.target.value);
        } else {
            selectedPriceRanges.delete(e.target.value);
        }
        
        // Chain the filters: First get province-filtered events, then filter those by price
        const provinceFiltered = getProvinceFilteredEvents();
        applyAllFilters();
        updateProvinceHint(); // Keeps your existing province hint working
    });
});

// ==========================================
// SEARCH FILTERING LOGIC
// ==========================================
let searchQuery = "";

// Helper: Check if event matches the search query
function matchesSearch(event, query) {
    if (!query) return true; // No search query, show all
    
    const q = query.toLowerCase();
    return (
        (event.title && event.title.toLowerCase().includes(q)) ||
        (event.province && event.province.toLowerCase().includes(q)) ||
        (event.description && event.description.toLowerCase().includes(q)) ||
        (event.category && event.category.toLowerCase().includes(q))
    );
}

// Filter function: Takes an array of events and returns only those matching the search
function filterEventsBySearch(events) {
    return events.filter(event => matchesSearch(event, searchQuery));
}

// Master function to apply all filters in sequence
function applyAllFilters() {
    const provinceFiltered = getProvinceFilteredEvents();
    const priceFiltered = filterEventsByPrice(provinceFiltered);
    const searchFiltered = filterEventsBySearch(priceFiltered);
    renderEvents(searchFiltered);
    updateProvinceHint();
}

// Event Listeners for Search
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

if (searchInput) {
    // Real-time filtering as user types
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        applyAllFilters();
    });
}

if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        searchQuery = searchInput.value.trim();
        applyAllFilters();
    });
}



function showAuthenticatedUI(user) {
    const loginLink = document.getElementById('navLogin');
    const signupLink = document.getElementById('navSignup');
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';

    document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = '';
    });

    const avatarContent = document.getElementById('avatarContent');
    const dropdownEmail = document.getElementById('dropdownEmail');
    const avatarBtn = document.getElementById('avatarBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (dropdownEmail) dropdownEmail.textContent = user.email;

    const avatarUrl = user.user_metadata?.avatar_url;
    if (avatarUrl && avatarContent) {
        avatarContent.innerHTML = `<img src="${avatarUrl}" alt="Profile">`;
    } else if (avatarContent) {
        const initials = user.email.substring(0, 2).toUpperCase();
        avatarContent.textContent = initials;
    }

    if (avatarBtn && profileDropdown) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!avatarBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }

    const dropdownLogoutBtn = document.getElementById('dropdownLogout');
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
    }

    updateItineraryCount();
}

document.addEventListener('DOMContentLoaded', checkAuth);


// ==========================================
// 2. LISTINGS DATA (business_posts is the single source of truth)
// ==========================================
let allEvents = [];
let myItineraryIds = new Set();
let selectedProvince = null; // locks itinerary to one province

async function loadAllEvents() {
  const { data: posts, error } = await supabaseClient
    .from('business_posts')
    .select('*')
    .eq('status', 'approved');

  if (error) {
    console.error('Business posts load error:', error.message);
    allEvents = [];
    return;
  }

  allEvents = (posts || []).map(p => ({
    id: p.id,
    title: p.title,
    province: p.province,
    category: p.category,
    date: p.date_text,
    price: p.price,
    rating: p.rating || 0,
    reviews: p.review_count || 0,
    image: p.image_url,
    description: p.description
  }));
}

// ==========================================
// 3. ITINERARY MANAGEMENT (Supabase-backed)
// ==========================================
async function loadMyItinerary() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    myItineraryIds = new Set();
    selectedProvince = null;
    updateItineraryCount();
    return;
  }

  const { data: items, error } = await supabaseClient
    .from('itineraries')
    .select('event_id, business_posts(province)')
    .eq('user_id', user.id);

  if (error) {
    console.error('Itinerary load error:', error.message);
    return;
  }

  myItineraryIds = new Set(items.map(i => i.event_id));
  selectedProvince = items.length ? items[0].business_posts?.province : null;

  updateItineraryCount();
  if (selectedProvince) showProvinceNotice(selectedProvince);
  else hideProvinceNotice();
}

function updateItineraryCount() {
  const countBadge = document.getElementById('itineraryCount');
  if (countBadge) {
    if (myItineraryIds.size > 0) {
      countBadge.textContent = myItineraryIds.size;
      countBadge.style.display = 'flex';
    } else {
      countBadge.style.display = 'none';
    }
  }
}

async function addToItinerary(eventId) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    showToast('Please log in to build your itinerary.', 'info');
    window.location.href = 'login.html';
    return;
  }

  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;

  if (selectedProvince && selectedProvince !== event.province) {
    showToast(`You can only add events from ${selectedProvince}. Clear your itinerary first to plan a trip to ${event.province} instead.`, 'error', 6000);
    return;
  }

  const { error } = await supabaseClient.from('itineraries').insert({
    user_id: user.id,
    event_id: eventId
  });

  if (error) {
    if (error.code === '23505') {
      showToast('This event is already in your itinerary!', 'info');
    } else {
      showToast('Error adding to itinerary: ' + error.message, 'error');
    }
    return;
  }

  await loadMyItinerary();

  const btn = document.querySelector(`[data-event-id="${eventId}"]`);
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
  }

  showToast(`${event.title} added to your itinerary!`, 'success');
}

function isInItinerary(eventId) {
  return myItineraryIds.has(eventId);
}

function showProvinceNotice(province) {
  const notice = document.getElementById('provinceNotice');
  if (notice) {
    notice.innerHTML = `<i class="fa-solid fa-map-marker-alt"></i> You're planning events in <strong>${province}</strong>`;
    notice.classList.add('active');
  }
}

function hideProvinceNotice() {
  const notice = document.getElementById('provinceNotice');
  if (notice) notice.classList.remove('active');
}

// ==========================================
// 4. DASHBOARD RENDERING
// ==========================================
const eventsGrid = document.getElementById('eventsGrid');

function renderEvents(data) {
  if (!data.length) {
    eventsGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:2rem;">No events found.</p>`;
    return;
  }

  eventsGrid.innerHTML = data.map(event => {
    const inItinerary = isInItinerary(event.id);
    const buttonClass = inItinerary ? 'btn-add added' : 'btn-add';
    const buttonText = inItinerary ? '<i class="fa-solid fa-check"></i> Added' : '<i class="fa-solid fa-plus"></i> Add';

    return `
    <div class="event-card">
        <div class="card-img-wrap">
            <img src="${event.image || ''}" alt="${event.title}">
            <button class="bookmark-btn" onclick="toggleBookmark(this)"><i class="fa-regular fa-bookmark"></i></button>
            <span class="province-badge">${event.province}</span>
        </div>
        <div class="card-body">
            <h3 class="card-title">${event.title}</h3>
            <div class="card-date"><i class="fa-regular fa-calendar"></i> ${event.date || 'See details'}</div>
            <div class="rating-wrap">
                <span class="stars"><i class="fa-solid fa-star"></i> ${event.rating || '—'}</span>
                <span class="review-count">${event.reviews ? `(${event.reviews})` : ''}</span>
            </div>
            <div class="card-footer">
                <button class="${buttonClass}" data-event-id="${event.id}" onclick="addToItinerary('${event.id}')">${buttonText}</button>
                <button class="btn-details" onclick="openModal('${event.id}')">View Details</button>
            </div>
        </div>
    </div>
    `;
  }).join('');
}

function toggleBookmark(btn) {
  btn.classList.toggle('active');
  const icon = btn.querySelector('i');
  icon.classList.toggle('fa-regular');
  icon.classList.toggle('fa-solid');
}

const modal = document.getElementById('eventModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

function openModal(id) {
  const event = allEvents.find(item => item.id === id);
  if (!event) return;

  modalBody.innerHTML = `
      <img src="${event.image || ''}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem;">
      <span class="province-badge" style="position: static; display: inline-block; margin-bottom: 0.5rem;">${event.province}</span>
      <h2 style="margin-bottom: 0.5rem;">${event.title}</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;"><i class="fa-regular fa-calendar"></i> ${event.date || ''} ${event.price ? `| <strong>${event.price}</strong>` : ''}</p>
      <p style="margin-bottom: 1.5rem;">${event.description || ''}</p>
      <button class="btn-post" style="width: 100%; justify-content: center; padding: 0.8rem; margin-bottom: 0.6rem;" onclick="addToItinerary('${event.id}'); closeModal.click();">Add to Itinerary</button>
      <a href="reviews.html?event_id=${event.id}&title=${encodeURIComponent(event.title)}&province=${encodeURIComponent(event.province)}" class="btn-details" style="width: 100%; justify-content: center; padding: 0.8rem; display: block; text-align: center; box-sizing: border-box;">
        <i class="fa-regular fa-star"></i> Leave a Review
      </a>
  `;
  modal.classList.add('active');
}

closeModal.onclick = () => modal.classList.remove('active');
window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  themeToggle.querySelector('i').className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
});

const menuToggle = document.getElementById('menuToggle');
const navActions = document.getElementById('navActions');
menuToggle.addEventListener('click', () => navActions.classList.toggle('active'));

const PROVINCE_NAME_BY_ID = {
  ZAEC: "Eastern Cape", ZAFS: "Free State", ZAGP: "Gauteng",
  ZAKZN: "KwaZulu-Natal", ZALP: "Limpopo", ZAMP: "Mpumalanga",
  ZANC: "Northern Cape", ZANW: "North West", ZAWC: "Western Cape"
};

let selectedProvinces = new Set();

function updateProvinceHint() {
  const hint = document.getElementById('provinceHint');
  if (!hint) return;
  hint.textContent = selectedProvinces.size === 0 ? 'All provinces' : `${selectedProvinces.size} selected`;
}

function getProvinceFilteredEvents() {
  if (selectedProvinces.size === 0) return allEvents;
  return allEvents.filter(event => selectedProvinces.has(event.province));
}

function applyProvinceFilter() {
  renderEvents(getProvinceFilteredEvents());
  updateProvinceHint();
}

document.querySelectorAll('.province-map .province').forEach(path => {
  const name = PROVINCE_NAME_BY_ID[path.id];
  if (!name) return;

  path.setAttribute('tabindex', '0');
  path.setAttribute('role', 'checkbox');
  path.setAttribute('aria-label', name);
  path.setAttribute('aria-checked', 'false');

  function toggleProvince() {
    if (selectedProvinces.has(name)) {
      selectedProvinces.delete(name);
      path.classList.remove('active');
      path.setAttribute('aria-checked', 'false');
    } else {
      selectedProvinces.add(name);
      path.classList.add('active');
      path.setAttribute('aria-checked', 'true');
    }
    applyProvinceFilter();
  }

  path.addEventListener('click', toggleProvince);
  path.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProvince(); }
  });
});

// ==========================================
// 5. INIT
// ==========================================
async function initDashboard() {
  await loadAllEvents();
  await loadMyItinerary();
  applyProvinceFilter();
}

initDashboard();