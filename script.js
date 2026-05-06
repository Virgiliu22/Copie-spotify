// --- State Management ---
let isPlaying = false;
let currentTrack = null;
let likedSongs = JSON.parse(localStorage.getItem('spotify_liked_songs')) || [];

let isShuffle = false;
let repeatMode = 0; 
let currentQueue = []; 
let shuffledQueue = [];

const userProfile = {
    name: "Grigorii Gainaru & Vergiliu Zagorodniuc",
    avatar: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&h=500&fit=crop",
    followers: 143,
    following: 90,
    playlists: 10
};

// --- DOM Elements ---
let audio, playPauseBtn, progressSlider, currentTimeEl, totalTimeEl;
let nowPlayingImg, nowPlayingTitle, nowPlayingArtist, playerHeartBtn;
let volumeSlider, lyricsView, fullScreenOverlay, fsPlayPauseBtn;
let views, navItems, searchInput, isDraggingProgress = false;

// --- Initialization ---
function init() {
    console.log("Initializing Spotify Player...");
    
    // Queries
    audio = document.getElementById('spotify-audio');
    playPauseBtn = document.getElementById('play-pause-btn-main');
    progressSlider = document.getElementById('progress-slider');
    currentTimeEl = document.getElementById('current-time');
    totalTimeEl = document.getElementById('total-time');
    
    nowPlayingImg = document.querySelector('.now-playing img');
    nowPlayingTitle = document.getElementById('current-track-title');
    nowPlayingArtist = document.getElementById('current-track-artist');
    playerHeartBtn = document.getElementById('player-heart-btn');
    
    volumeSlider = document.getElementById('volume-slider');
    lyricsView = document.getElementById('lyrics-view');
    fullScreenOverlay = document.getElementById('full-screen-overlay');
    fsPlayPauseBtn = document.getElementById('fs-play-pause');
    
    views = document.querySelectorAll('.view');
    navItems = document.querySelectorAll('.nav-item');
    searchInput = document.getElementById('spotify-search');

    setupListeners();
    renderHome();
    updateUserUI();
    showView('home-view');
    
    if (audio && volumeSlider) {
        audio.volume = volumeSlider.value / 100;
    }
    
    updateIcons();
    console.log("Initialization complete.");
}

function setupListeners() {
    // Play/Pause
    if (playPauseBtn) playPauseBtn.onclick = togglePlayPause;
    if (fsPlayPauseBtn) fsPlayPauseBtn.onclick = togglePlayPause;

    // Progress Slider
    if (progressSlider) {
        progressSlider.onmousedown = () => isDraggingProgress = true;
        progressSlider.onmouseup = () => isDraggingProgress = false;
        progressSlider.ontouchstart = () => isDraggingProgress = true;
        progressSlider.ontouchend = () => isDraggingProgress = false;

        const seek = () => {
            if (!audio.src || isNaN(audio.duration)) return;
            const progress = progressSlider.value;
            const time = (progress / 100) * audio.duration;
            audio.currentTime = time;
            progressSlider.style.backgroundSize = `${progress}% 100%`;
        };

        progressSlider.oninput = seek;
        progressSlider.onchange = seek;
    }

    // Volume
    if (volumeSlider) {
        volumeSlider.oninput = (e) => {
            audio.volume = e.target.value / 100;
        };
    }

    // Audio Events
    audio.onplay = () => { 
        isPlaying = true; 
        document.querySelectorAll('.play-pause-btn, #fs-play-pause').forEach(btn => btn.classList.add('playing'));
    };
    audio.onpause = () => { 
        isPlaying = false; 
        document.querySelectorAll('.play-pause-btn, #fs-play-pause').forEach(btn => btn.classList.remove('playing'));
    };
    audio.ontimeupdate = updateProgressUI;
    audio.onended = () => playNext(true);
    audio.onerror = () => {
        console.error("Audio error - source might be invalid or expired.");
        isPlaying = false;
        document.querySelectorAll('.play-pause-btn, #fs-play-pause').forEach(btn => btn.classList.remove('playing'));
    };

    // Nav
    const navHome = document.getElementById('nav-home');
    const navSearch = document.getElementById('nav-search');
    const goProfile = document.getElementById('go-profile');
    const userBtn = document.getElementById('user-btn');

    if (navHome) navHome.onclick = () => showView('home-view');
    if (navSearch) navSearch.onclick = () => showView('search-view');
    if (goProfile) goProfile.onclick = () => showView('profile-view');
    if (userBtn) {
        userBtn.onclick = (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        };
    }

    // Controls
    const sBtn = document.getElementById('shuffle-btn');
    const rBtn = document.getElementById('repeat-btn');
    const nBtn = document.getElementById('next-btn');
    const pBtn = document.getElementById('prev-btn');
    const fsSBtn = document.getElementById('fs-shuffle-btn');
    const fsRBtn = document.getElementById('fs-repeat-btn');
    const fsNBtn = document.getElementById('fs-next-btn');
    const fsPBtn = document.getElementById('fs-prev-btn');

    if (sBtn) sBtn.onclick = toggleShuffle;
    if (fsSBtn) fsSBtn.onclick = toggleShuffle;
    if (rBtn) rBtn.onclick = toggleRepeat;
    if (fsRBtn) fsRBtn.onclick = toggleRepeat;
    if (nBtn) nBtn.onclick = () => playNext();
    if (fsNBtn) fsNBtn.onclick = () => playNext();
    if (pBtn) pBtn.onclick = playPrev;
    if (fsPBtn) fsPBtn.onclick = playPrev;

    // Extras
    const lBtn = document.getElementById('toggle-lyrics');
    const fBtn = document.getElementById('toggle-fullscreen');
    const cFBtn = document.getElementById('close-fullscreen');
    const pMBtn = document.getElementById('explore-premium-btn');
    const cPBtn = document.getElementById('close-premium');

    if (lBtn) lBtn.onclick = toggleLyrics;
    const qBtn = document.getElementById('toggle-queue');
    if (qBtn) qBtn.onclick = toggleQueue;
    const cBtn = document.getElementById('toggle-connect');
    if (cBtn) cBtn.onclick = () => alert("Connect to a device feature coming soon!");
    
    if (fBtn) fBtn.onclick = openFullScreen;
    if (cFBtn) cFBtn.onclick = closeFullScreen;
    if (pMBtn) pMBtn.onclick = () => document.getElementById('premium-modal').style.display = 'flex';
    if (cPBtn) cPBtn.onclick = () => document.getElementById('premium-modal').style.display = 'none';

    // Global
    document.addEventListener('click', () => {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    });

    if (searchInput) searchInput.addEventListener('input', handleSearch);

    // Sidebar Playlists
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.onclick = () => renderPlaylist(item.getAttribute('data-id'));
    });

    // Search Category Cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.onclick = () => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            renderPlaylist(title.replace(' ', '-'));
        };
    });
}

function updateProgressUI() {
    if (!audio.duration || isNaN(audio.duration) || isDraggingProgress) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    if (progressSlider) {
        progressSlider.value = progress;
        progressSlider.style.backgroundSize = `${progress}% 100%`;
    }
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function updateIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateUserUI() {
    const pName = document.getElementById('profile-name');
    const pAvatar = document.getElementById('profile-avatar-img');
    const uBtn = document.getElementById('user-btn');

    if (pName) pName.textContent = userProfile.name;
    if (pAvatar) pAvatar.src = userProfile.avatar;
    if (uBtn) uBtn.innerHTML = `<img src="${userProfile.avatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">`;
}

// --- View Logic ---
function showView(viewId) {
    if (!views) return;
    views.forEach(v => v.style.display = 'none');
    const lyricsV = document.getElementById('lyrics-view');
    if (lyricsV) lyricsV.style.display = 'none';
    
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.id === `nav-${viewId.split('-')[0]}`) item.classList.add('active');
    });
}

function renderHome() {
    const homeView = document.getElementById('home-view');
    if (!homeView) return;
    
    homeView.innerHTML = `
        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 24px; letter-spacing: -1px;">Good evening</h2>
        <div class="top-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 40px;">
            ${generateQuickCard('Liked Songs', 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300&h=300&fit=crop', 'liked')}
            ${generateQuickCard('Chill Vibes', 'https://picsum.photos/seed/chill/300/300', 'chill')}
            ${generateQuickCard('Jazz Classics', 'https://picsum.photos/seed/jazz/300/300', 'jazz')}
            ${generateQuickCard('Daily Mix 1', 'https://picsum.photos/seed/mix1/300/300', 'mix')}
            ${generateQuickCard('Discover Weekly', 'https://picsum.photos/seed/discover/300/300', 'discover')}
            ${generateQuickCard('Release Radar', 'https://picsum.photos/seed/radar/300/300', 'radar')}
        </div>

        <h3 style="font-size: 24px; font-weight: 900; margin-bottom: 16px;">Made For You</h3>
        <div class="grid-container" id="home-grid"></div>
    `;

    const homeGrid = document.getElementById('home-grid');
    if (!homeGrid) return;

    const mockData = [
        { trackId: 'm1', trackName: 'Today\'s Top Hits', artistName: 'Global Hits', artworkUrl100: 'https://picsum.photos/seed/hits/400/400', previewUrl: 'https://p.scdn.co/mp3-preview/790f9486c873f554ef42551ec9f1505315577607?cid=774b29d4f13844c495f2061947e40fc2' },
        { trackId: 'm2', trackName: 'Jazz Classics', artistName: 'Gentle Piano', artworkUrl100: 'https://picsum.photos/seed/jazz/400/400', previewUrl: '' },
        { trackId: 'm3', trackName: 'Rock Legends', artistName: 'Masterpieces', artworkUrl100: 'https://picsum.photos/seed/rock/400/400', previewUrl: '' },
        { trackId: 'm4', trackName: 'Chill Vibes', artistName: 'Liquid Gold', artworkUrl100: 'https://picsum.photos/seed/chill/400/400', previewUrl: '' },
        { trackId: 'm5', trackName: 'Night Rider', artistName: 'Synthwave', artworkUrl100: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=400&fit=crop', previewUrl: '' },
        { trackId: 'm6', trackName: 'Pop Rising', artistName: 'Daily Dose', artworkUrl100: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop', previewUrl: '' }
    ];

    mockData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="position: relative;">
                <img src="${item.artworkUrl100}" alt="${item.trackName}">
                <button class="play-hover-btn"><i data-lucide="play" fill="black"></i></button>
            </div>
            <div class="card-title">${item.trackName}</div>
            <p class="card-description">${item.artistName}</p>
        `;
        card.onclick = () => {
            if (item.previewUrl) playTrack(item);
            else renderPlaylist(item.trackName.toLowerCase().includes('chill') ? 'chill' : 'other');
        };
        homeGrid.appendChild(card);
    });
    updateIcons();
}

function generateQuickCard(title, img, type) {
    return `
        <div class="quick-card" onclick="renderPlaylist('${type}')">
            <img src="${img}" alt="${title}">
            <span>${title}</span>
            <button class="quick-play-btn"><i data-lucide="play" fill="black"></i></button>
        </div>
    `;
}

// --- Playback Logic ---
function playTrack(track) {
    if (!track.previewUrl) {
        alert("This track has no preview available.");
        return;
    }
    currentTrack = track;
    audio.src = track.previewUrl;
    audio.play().catch(err => console.log("Play error: ", err));

    if (nowPlayingImg) nowPlayingImg.src = track.artworkUrl100.replace('100x100', '400x400');
    if (nowPlayingTitle) nowPlayingTitle.textContent = track.trackName;
    if (nowPlayingArtist) nowPlayingArtist.textContent = track.artistName;
    
    updatePlayerHeartUI();
}

function togglePlayPause() {
    if (!currentTrack) {
        const firstCard = {
            trackId: 'default',
            trackName: 'Today\'s Top Hits',
            artistName: 'Global Hits',
            artworkUrl100: 'https://picsum.photos/seed/hits/400/400',
            previewUrl: 'https://p.scdn.co/mp3-preview/790f9486c873f554ef42551ec9f1505315577607?cid=774b29d4f13844c495f2061947e40fc2'
        };
        playTrack(firstCard);
        return;
    }
    if (isPlaying) audio.pause();
    else audio.play().catch(err => console.log("Play error: ", err));
}

function playNext(auto = false) {
    if (!currentTrack) return;
    const queue = isShuffle ? shuffledQueue : currentQueue;
    if (queue.length === 0) return;
    let idx = queue.findIndex(t => t.trackId === currentTrack.trackId) + 1;
    if (idx >= queue.length) idx = 0;
    playTrack(queue[idx]);
}

function playPrev() {
    if (!currentTrack) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const queue = isShuffle ? shuffledQueue : currentQueue;
    if (queue.length === 0) return;
    let idx = queue.findIndex(t => t.trackId === currentTrack.trackId) - 1;
    if (idx < 0) idx = queue.length - 1;
    playTrack(queue[idx]);
}

// --- Extras ---
function toggleLyrics() {
    const lView = document.getElementById('lyrics-view');
    if (!lView) return;
    if (lView.style.display === 'flex') {
        lView.style.display = 'none';
        showView('home-view');
    } else {
        views.forEach(v => v.style.display = 'none');
        lView.style.display = 'flex';
        renderLyrics();
    }
}

function renderLyrics() {
    const lView = document.getElementById('lyrics-view');
    if (!lView) return;
    lView.style.background = 'linear-gradient(to bottom, #4d4d4d, #000)';
    lView.innerHTML = `<h2 style="font-size: 13px; font-weight: 800; margin-bottom: 60px; color: #fff; opacity: 0.5; letter-spacing: 0.2em;">LYRICS</h2>`;
    const mockLines = ["Walking on sunshine", "And don't it feel good", "Music playing everywhere", "In this digital machine", "Ragesov built this for the win"];
    mockLines.forEach(line => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.textContent = line;
        lView.appendChild(p);
    });
}

function openFullScreen() {
    if (!currentTrack || !fullScreenOverlay) return;
    fullScreenOverlay.style.display = 'flex';
    document.getElementById('fs-album-art').src = currentTrack.artworkUrl100.replace('100x100', '600x600');
    document.getElementById('fs-title').textContent = currentTrack.trackName;
    document.getElementById('fs-artist').textContent = currentTrack.artistName;
}

function closeFullScreen() {
    if (fullScreenOverlay) fullScreenOverlay.style.display = 'none';
}

function toggleQueue() {
    const qView = document.getElementById('queue-view');
    if (!qView) return;
    if (qView.style.display === 'block') {
        showView('home-view');
    } else {
        showView('queue-view');
        renderQueue();
    }
}

function renderQueue() {
    const nowPlayingContainer = document.getElementById('queue-now-playing');
    const nextUpContainer = document.getElementById('queue-next-up');
    if (!nowPlayingContainer || !nextUpContainer) return;

    // Now Playing
    if (currentTrack) {
        nowPlayingContainer.innerHTML = `
            <div class="track-row" style="grid-template-columns: 48px 4fr 1fr; background: rgba(255,255,255,0.1);">
                <img src="${currentTrack.artworkUrl100}" style="width: 40px; height: 40px; border-radius: 4px;">
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <div style="color: #1ed760; font-weight: 500;">${currentTrack.trackName}</div>
                    <div style="font-size: 12px; color: var(--text-subdued);">${currentTrack.artistName}</div>
                </div>
                <span style="display: flex; align-items: center; justify-content: flex-end; color: #1ed760;">Playing</span>
            </div>
        `;
    }

    // Next Up
    const queue = isShuffle ? shuffledQueue : currentQueue;
    nextUpContainer.innerHTML = '';
    if (queue.length > 0 && currentTrack) {
        const currentIndex = queue.findIndex(t => t.trackId === currentTrack.trackId);
        const nextTracks = queue.slice(currentIndex + 1, currentIndex + 11); // Show next 10

        nextTracks.forEach((track, i) => {
            const row = document.createElement('div');
            row.className = 'track-row';
            row.style.gridTemplateColumns = '48px 4fr 1fr';
            row.style.gap = '12px';
            row.innerHTML = `
                <img src="${track.artworkUrl100}" style="width: 40px; height: 40px; border-radius: 4px;">
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <div style="color: white; font-weight: 500;">${track.trackName}</div>
                    <div style="font-size: 12px; color: var(--text-subdued);">${track.artistName}</div>
                </div>
                <span style="display: flex; align-items: center; justify-content: flex-end;">${formatTime(track.trackTimeMillis / 1000)}</span>
            `;
            row.onclick = () => playTrack(track);
            nextUpContainer.appendChild(row);
        });
    }
}

function toggleShuffle() { 
    isShuffle = !isShuffle; 
    if (isShuffle && currentQueue.length > 0) {
        shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);
    }
    updateControlUI(); 
}

function toggleRepeat() { 
    repeatMode = (repeatMode + 1) % 3; 
    updateControlUI(); 
}

function updateControlUI() { 
    const sBtn = document.getElementById('shuffle-btn');
    const rBtn = document.getElementById('repeat-btn');
    const fsSBtn = document.getElementById('fs-shuffle-btn');
    const fsRBtn = document.getElementById('fs-repeat-btn');

    if (sBtn) sBtn.classList.toggle('active-control', isShuffle);
    if (fsSBtn) fsSBtn.classList.toggle('active-control', isShuffle);

    if (rBtn) {
        rBtn.classList.toggle('active-control', repeatMode > 0);
        rBtn.setAttribute('data-lucide', repeatMode === 2 ? 'repeat-1' : 'repeat');
    }
    if (fsRBtn) {
        fsRBtn.classList.toggle('active-control', repeatMode > 0);
        fsRBtn.setAttribute('data-lucide', repeatMode === 2 ? 'repeat-1' : 'repeat');
    }
    updateIcons(); 
}

async function renderPlaylist(type) {
    const titleEl = document.getElementById('playlist-title');
    const imgEl = document.getElementById('playlist-img');
    const container = document.getElementById('playlist-tracks');
    
    let searchTerm = type === 'liked' ? 'hits' : type;
    if (titleEl) titleEl.textContent = searchTerm.toUpperCase();
    if (imgEl) imgEl.src = `https://picsum.photos/seed/${searchTerm}/400/400`;
    
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&media=music&limit=15`);
        const data = await res.json();
        currentQueue = data.results;
        
        if (container) {
            container.innerHTML = '';
            currentQueue.forEach((track, i) => {
                const row = document.createElement('div');
                row.className = 'track-row';
                row.style.gridTemplateColumns = '40px 48px 4fr 1fr';
                row.style.gap = '12px';
                row.innerHTML = `
                    <span style="display: flex; align-items: center; justify-content: center;">${i+1}</span>
                    <img src="${track.artworkUrl100}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                    <div style="display: flex; flex-direction: column; justify-content: center;">
                        <div class="track-title" style="color: white; font-weight: 500;">${track.trackName}</div>
                        <div style="font-size: 12px; color: var(--text-subdued);">${track.artistName}</div>
                    </div>
                    <span style="display: flex; align-items: center; justify-content: flex-end;">${formatTime(track.trackTimeMillis / 1000)}</span>
                `;
                row.onclick = () => playTrack(track);
                container.appendChild(row);
            });
        }
        showView('playlist-view');
    } catch (e) { console.error("Failed to load playlist", e); }
}

function updatePlayerHeartUI() {
    if (!currentTrack || !playerHeartBtn) return;
    playerHeartBtn.innerHTML = `<i data-lucide="heart" size="20"></i>`;
    updateIcons();
}

let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length < 2) return;
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=20`);
            const data = await res.json();
            // Search rendering logic here...
        } catch (e) { console.error("Search failed", e); }
    }, 400);
}

// Start everything
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
