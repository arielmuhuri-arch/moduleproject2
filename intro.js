const JIKAN = "https://api.jikan.moe/v4";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadTop(); // Load top anime on start
  
  // Allow pressing "Enter" in search box
  const searchInput = document.getElementById("q");
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") search();
  });
});

// Generic Fetch Function
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.data; // Jikan wraps results in .data
  } catch (error) {
    console.error(error);
    showToast("Error fetching data. Try again.");
    return [];
  }
}

// 1. Load Top Anime
async function loadTop() {
  const list = await fetchData(`${JIKAN}/top/anime?limit=20&filter=bypopularity`);
  render(list, "Top Popular Anime");
}

// 2. Load Airing Anime
async function loadAiring() {
  const list = await fetchData(`${JIKAN}/seasons/now?limit=20`);
  render(list, "Currently Airing");
}

// 3. Load Upcoming Anime
async function loadUpcoming() {
  const list = await fetchData(`${JIKAN}/seasons/upcoming?limit=20`);
  render(list, "Upcoming Anime");
}

// 4. Search Function (FIXED)
async function search() {
  const query = document.getElementById("q").value.trim();
  
  if (!query) {
    showToast("Please enter an anime name");
    return;
  }

  // Show loading state
  document.getElementById("grid").innerHTML = '<div class="loading">Searching...</div>';

  // Correctly encode the query for URL
  const url = `${JIKAN}/anime?q=${encodeURIComponent(query)}&limit=20`;
  const list = await fetchData(url);

  if (list.length === 0) {
    document.getElementById("grid").innerHTML = '<div class="loading">No anime found for "' + query + '"</div>';
  } else {
    render(list, `Search Results: "${query}"`);
  }
}

// Render Grid
function render(list, title) {
  const grid = document.getElementById("grid");
  
  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="loading">No results found.</div>';
    return;
  }

  grid.innerHTML = list.map(anime => `
    <div class="card" onclick="showDetails(${anime.mal_id})">
      <img src="${anime.images.jpg.large_image_url}" alt="${anime.title}" loading="lazy">
      <div class="info">
        <h3>${anime.title}</h3>
        <div class="meta">${anime.type || 'TV'} • ${anime.episodes || '?'} eps</div>
        <span class="score">★ ${anime.score || 'N/A'}</span>
        <button class="dl" onclick="event.stopPropagation(); downloadInfo(${anime.mal_id}, '${escapeHtml(anime.title)}')">⬇ Info</button>
      </div>
    </div>
  `).join("");
}

// Show Details Modal
async function showDetails(id) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  
  modal.classList.add("show");
  body.innerHTML = '<div class="loading">Loading details...</div>';

  try {
    const response = await fetch(`${JIKAN}/anime/${id}/full`);
    const data = await response.json();
    const anime = data.data;

    body.innerHTML = `
      <div class="modal-body">
        <img src="${anime.images.jpg.large_image_url}" alt="${anime.title}">
        <div class="details">
          <h2>${anime.title}</h2>
          <p><strong>Status:</strong> ${anime.status}</p>
          <p><strong>Episodes:</strong> ${anime.episodes || '?'}</p>
          <p><strong>Score:</strong> ★ ${anime.score || 'N/A'}</p>
          <p><strong>Genres:</strong> ${anime.genres.map(g => g.name).join(', ')}</p>
          <p style="margin-top:10px; line-height:1.4;">${anime.synopsis ? anime.synopsis.substring(0, 500) + '...' : 'No synopsis available.'}</p>
          
          <div class="actions">
            <button onclick="watchAnime('${escapeHtml(anime.title)}')">▶ Watch Placeholder</button>
            <button onclick="downloadInfo(${anime.mal_id}, '${escapeHtml(anime.title)}')">⬇ Download JSON</button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    body.innerHTML = '<div class="loading">Failed to load details.</div>';
    console.error(error);
  }
}

// Download JSON Info
function downloadInfo(id, title) {
  const info = {
    mal_id: id,
    title: title,
    downloaded_at: new Date().toISOString(),
    source: "AniVerse"
  };
  
  const blob = new Blob([JSON.stringify(info, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_info.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`Downloaded info for ${title}`);
}

// Placeholder Watch Function
function watchAnime(title) {
  showToast(`Now playing: ${title} (Integration required)`);
}

// Close Modal
function close() {
  document.getElementById("modal").classList.remove("show");
}

// Utility: Escape HTML to prevent XSS issues in titles
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Toast Notification
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}