const JIKAN_BASE = "https://api.jikan.moe/v4";
const ANILIST_BASE = "https://graphql.anilist.co";

let currentAnime = null;
let currentEpisode = 1;

// AniList helper
async function fetchAniList(query, variables = {}) {
    try {
        const res = await fetch(ANILIST_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables })
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0].message);
        return json.data;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Create anime card
function createCard(anime, source = "jikan") {
    let id, title, image, score, year, episodes;

    if (source === "jikan") {
        id = anime.mal_id;
        title = anime.title;
        image = anime.images?.jpg?.image_url || "";
        score = anime.score || "?";
        year = anime.year || "TBA";
        episodes = anime.episodes || 12;
    } else {
        id = anime.id;
        title = anime.title?.romaji || anime.title?.english || "Unknown";
        image = anime.coverImage?.large || "";
        score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "?";
        year = anime.seasonYear || "TBA";
        episodes = anime.episodes || 12;
    }

    return `
        <div class="card" onclick="showDetails(${id}, '${source}')">
            <img src="${image}" alt="${title}">
            <div class="card-info">
                <span class="score">★ ${score}</span>
                <h3>${title}</h3>
                <small style="color:#94a3b8;">${year} • ${episodes} eps</small>
            </div>
        </div>
    `;
}

// Load Top Anime
async function loadTopAnime() {
    const grid = document.getElementById("topGrid");
    grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#94a3b8;'>Loading top anime...</p>";

    try {
        const res = await fetch(`${JIKAN_BASE}/top/anime?limit=13`);
        const data = await res.json();
        grid.innerHTML = "";
        data.data.forEach(anime => grid.innerHTML += createCard(anime, "jikan"));
    } catch (e) {
        grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#f87171;'>Failed to load data.</p>";
    }
}

// Search
async function searchAnime(query) {
    if (!query) return;
    document.getElementById("searchTitle").style.display = "block";
    const grid = document.getElementById("searchGrid");
    grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#94a3b8;'>Searching...</p>";

    try {
        const res = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=12`);
        const data = await res.json();
        grid.innerHTML = "";
        if (data.data.length === 0) {
            grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#94a3b8;'>No results found.</p>";
            return;
        }
        data.data.forEach(anime => grid.innerHTML += createCard(anime, "jikan"));
    } catch (e) {
        grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#f87171;'>Search failed.</p>";
    }
}

// Show Details
async function showDetails(id, source) {
    currentAnime = null;

    if (source === "jikan") {
        try {
            const res = await fetch(`${JIKAN_BASE}/anime/${id}`);
            const data = await res.json();
            const a = data.data;
            currentAnime = {
                id: a.mal_id,
                title: a.title,
                image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
                score: a.score,
                episodes: a.episodes || 12,
                year: a.year,
                synopsis: a.synopsis || "No synopsis available."
            };
        } catch (e) {}
    }

    if (!currentAnime) {
        const query = `query ($id: Int) { Media(id: $id, type: ANIME) { id title { romaji english } coverImage { large } averageScore episodes seasonYear description }}`;
        const data = await fetchAniList(query, { id: parseInt(id) });
        if (data?.Media) {
            const m = data.Media;
            currentAnime = {
                id: m.id,
                title: m.title.romaji || m.title.english,
                image: m.coverImage.large,
                score: m.averageScore ? (m.averageScore / 10).toFixed(1) : "?",
                episodes: m.episodes || 12,
                year: m.seasonYear,
                synopsis: m.description ? m.description.replace(/<[^>]+>/g, '') : "No synopsis available."
            };
        }
    }

    if (!currentAnime) {
        alert("Could not load anime details.");
        return;
    }

    document.getElementById("modalImg").src = currentAnime.image;
    document.getElementById("modalTitle").textContent = currentAnime.title;
    document.getElementById("modalInfo").innerHTML = `★ ${currentAnime.score} | ${currentAnime.episodes} episodes | ${currentAnime.year || "Unknown"}`;
    document.getElementById("modalSynopsis").innerHTML = currentAnime.synopsis;

    document.getElementById("modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

// Watch Anime with Episode Selection
function watchAnime() {
    if (!currentAnime) return;
    closeModal();

    const videoModal = document.getElementById("videoModal");
    const titleEl = document.getElementById("videoTitle");
    const episodeList = document.getElementById("episodeList");

    titleEl.textContent = currentAnime.title;

    // Generate episode buttons
    episodeList.innerHTML = "";
    for (let i = 1; i <= Math.min(currentAnime.episodes, 12); i++) {  // limit to 12 for demo
        const btn = document.createElement("button");
        btn.className = `episode-btn ${i === currentEpisode ? 'active' : ''}`;
        btn.textContent = `Episode ${i}`;
        btn.onclick = () => playEpisode(i);
        episodeList.appendChild(btn);
    }

    videoModal.style.display = "flex";
    playEpisode(currentEpisode);
}

function playEpisode(episodeNum) {
    currentEpisode = episodeNum;

    // Highlight active button
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === `Episode ${episodeNum}`);
    });

    const player = document.getElementById("animePlayer");
    const loading = document.getElementById("loadingOverlay");

    loading.style.display = "flex";

    // Demo video (same for all episodes in this demo)
    player.src = ;

    player.onloadeddata = () => {
        loading.style.display = "none";
        player.play().catch(() => {});
    };
}

function closeVideoModal() {
    const videoModal = document.getElementById("videoModal");
    const player = document.getElementById("animePlayer");
    player.pause();
    player.src = "";
    videoModal.style.display = "none";
}

// Download
function downloadAnime() {
    if (!currentAnime) return;
    alert(`Starting download for ${currentAnime.title}...\n\n(In a full project this would trigger a real download link)`);
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(currentAnime.title + " full episode")}`, "_blank");
}

// Watchlist
function addToWatchlist() {
    if (!currentAnime) return;
    let list = JSON.parse(localStorage.getItem("aniVerseWatchlist") || "[]");
    if (!list.find(item => item.id === currentAnime.id)) {
        list.push({ id: currentAnime.id, title: currentAnime.title, image: currentAnime.image });
        localStorage.setItem("aniVerseWatchlist", JSON.stringify(list));
        alert(`✅ Added "${currentAnime.title}" to your Watchlist!`);
    } else {
        alert("Already in your watchlist.");
    }
}

// Load Recommended
async function loadRecommended() {
    const grid = document.getElementById("recGrid");
    grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#94a3b8;'>Loading recommendations...</p>";

    const query = `query { Page(page:1, perPage:8) { media(type:ANIME, sort:POPULARITY_DESC) { id title { romaji } coverImage { large } averageScore seasonYear episodes }}}`;
    const data = await fetchAniList(query);

    grid.innerHTML = "";
    if (data?.Page?.media) {
        data.Page.media.forEach(anime => grid.innerHTML += createCard(anime, "anilist"));
    } else {
        grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#f87171;'>Could not load recommendations.</p>";
    }
}

// Initialize
window.onload = () => {
    loadTopAnime();
    setTimeout(loadRecommended, 600);
};