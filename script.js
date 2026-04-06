// --- State Management ---
let isPlaying = false;
let currentTrack = null;
let likedSongs = JSON.parse(localStorage.getItem('spotify_liked_songs')) || [];

// Playback Logic State
let isShuffle = false;
let repeatMode = 0; // 0: None, 1: Playlist, 2: Track
let currentQueue = []; 
let shuffledQueue = [];
let currentIndex = -1;

const userProfile = {
    name: "Grigorii Gainaru & Vergiliu Zagorodniuc",
    avatar: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&h=500&fit=crop", // BMW Lights Avatar
    followers: 143,
    following: 90,
    playlists: 10
};

// --- DOM Elements ---
const audio = document.getElementById('spotify-audio');
const playPauseBtn = document.getElementById('play-pause-btn-main');
const playPauseIcon = playPauseBtn.querySelector('i');
const progressFill = document.querySelector('.progress-fill');
const currentTimeEl = document.querySelector('.progress-bar-container span:first-child');
const totalTimeEl = document.querySelector('.progress-bar-container span:last-child');

const nowPlayingImg = document.querySelector('.now-playing img');
const nowPlayingTitle = document.getElementById('current-track-title');
const nowPlayingArtist = document.getElementById('current-track-artist');
const playerHeartBtn = document.getElementById('player-heart-btn');

const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const searchInput = document.getElementById('spotify-search');

// Control Buttons
const shuffleBtn = document.getElementById('shuffle-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const repeatBtn = document.getElementById('repeat-btn');

// New UI Elements
const volumeSlider = document.getElementById('volume-slider');
const lyricsView = document.getElementById('lyrics-view');
const toggleLyricsBtn = document.getElementById('toggle-lyrics');
const fullScreenOverlay = document.getElementById('full-screen-overlay');
const toggleFullScreenBtn = document.getElementById('toggle-fullscreen');
const closeFullScreenBtn = document.getElementById('close-fullscreen');
const premiumModal = document.getElementById('premium-modal');
const explorePremiumBtn = document.getElementById('explore-premium-btn');
const closePremiumBtn = document.getElementById('close-premium');

// FS Controls
const fsPlayPauseBtn = document.getElementById('fs-play-pause');
const fsPrevBtn = document.getElementById('fs-prev-btn');
const fsNextBtn = document.getElementById('fs-next-btn');
const fsShuffleBtn = document.getElementById('fs-shuffle-btn');
const fsRepeatBtn = document.getElementById('fs-repeat-btn');

// --- Initialization ---
function init() {
    lucide.createIcons();
    renderHome();
    updateUserUI();
    showView('home-view');
    
    audio.volume = volumeSlider.value / 100;
}

function updateIcons() {
    lucide.createIcons();
}

function updateUserUI() {
    document.getElementById('profile-name').textContent = userProfile.name;
    document.getElementById('profile-avatar-img').src = userProfile.avatar;
    const userBtn = document.getElementById('user-btn');
    userBtn.innerHTML = `<img src="${userProfile.avatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">`;
}

// --- View Switching ---
function showView(viewId) {
    views.forEach(v => v.style.display = 'none');
    lyricsView.style.display = 'none';
    
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.style.display = 'block';
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.id === `nav-${viewId.split('-')[0]}`) item.classList.add('active');
    });

    window.scrollTo(0, 0);
}

// --- Navigation & Interactive Listeners ---
document.getElementById('nav-home').addEventListener('click', () => showView('home-view'));
document.getElementById('nav-search').addEventListener('click', () => showView('search-view'));
document.getElementById('go-profile').addEventListener('click', () => showView('profile-view'));

document.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', () => renderPlaylist(item.getAttribute('data-id')));
});

// User Menu
document.getElementById('user-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', () => document.getElementById('user-dropdown')?.style && (document.getElementById('user-dropdown').style.display = 'none'));

document.getElementById('do-logout').addEventListener('click', () => {
    audio.pause();
    isPlaying = false;
    currentTrack = null;
    showView('home-view');
    alert("Logged out successfully!");
});

// Premium Modal
explorePremiumBtn.onclick = () => premiumModal.style.display = 'flex';
closePremiumBtn.onclick = () => premiumModal.style.display = 'none';
premiumModal.onclick = (e) => { if(e.target === premiumModal) premiumModal.style.display = 'none'; };

// Volume Control
volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value / 100;
});

// --- Playback Controls ---

function toggleShuffle() {
    isShuffle = !isShuffle;
    if (isShuffle) {
        shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);
    }
    updateControlUI();
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    updateControlUI();
}

function updateControlUI() {
    // Main UI
    shuffleBtn.classList.toggle('control-active', isShuffle);
    fsShuffleBtn.classList.toggle('control-active', isShuffle);
    
    // Repeat UI logic
    repeatBtn.classList.toggle('control-active', repeatMode > 0);
    fsRepeatBtn.classList.toggle('control-active', repeatMode > 0);
    
    if (repeatMode === 2) {
        repeatBtn.setAttribute('data-lucide', 'repeat-1');
        fsRepeatBtn.setAttribute('data-lucide', 'repeat-1');
    } else {
        repeatBtn.setAttribute('data-lucide', 'repeat');
        fsRepeatBtn.setAttribute('data-lucide', 'repeat');
    }
    
    updateIcons();
}

shuffleBtn.onclick = toggleShuffle;
fsShuffleBtn.onclick = toggleShuffle;
repeatBtn.onclick = toggleRepeat;
fsRepeatBtn.onclick = toggleRepeat;

nextBtn.onclick = () => playNext();
fsNextBtn.onclick = () => playNext();
prevBtn.onclick = () => playPrev();
fsPrevBtn.onclick = () => playPrev();

function playNext(auto = false) {
    if (repeatMode === 2 && auto) {
        playTrack(currentTrack);
        return;
    }

    const queue = isShuffle ? shuffledQueue : currentQueue;
    if (queue.length === 0) return;

    let nextIdx = queue.findIndex(t => t.trackId === currentTrack.trackId) + 1;
    
    if (nextIdx >= queue.length) {
        if (repeatMode === 1) nextIdx = 0;
        else {
            if (auto) { audio.pause(); isPlaying = false; updateIcons(); }
            return;
        }
    }
    
    playTrack(queue[nextIdx]);
}

function playPrev() {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    const queue = isShuffle ? shuffledQueue : currentQueue;
    if (queue.length === 0) return;

    let prevIdx = queue.findIndex(t => t.trackId === currentTrack.trackId) - 1;
    if (prevIdx < 0) {
        if (repeatMode === 1) prevIdx = queue.length - 1;
        else return;
    }
    
    playTrack(queue[prevIdx]);
}

// --- Lyrics / Karaoke Mode ---
const mockLyrics = [
    "I'm walking on sunshine, whoa!",
    "And don't it feel good!",
    "Hey, alright now!",
    "I used to think maybe you loved me",
    "Now baby I'm sure",
    "And I just can't wait till the day",
    "When you knock on my door",
    "I'm walking on sunshine, whoa!",
    "I'm walking on sunshine, whoa!",
    "And don't it feel good!!",
    "Alright now!",
    "I'm walking on sunshine, whoa!",
    "Feel the magic in the air",
    "Music playing everywhere",
    "Every beat is like a dream",
    "In this digital machine",
    "Ragesov built this for the win",
    "Let the premium life begin!"
];

toggleLyricsBtn.onclick = () => {
    if (lyricsView.style.display === 'flex') {
        lyricsView.style.display = 'none';
        showView('home-view');
        toggleLyricsBtn.style.color = 'var(--text-subdued)';
    } else {
        views.forEach(v => v.style.display = 'none');
        lyricsView.style.display = 'flex';
        toggleLyricsBtn.style.color = 'var(--text-bright-accent)';
        renderLyrics();
    }
};

function renderLyrics() {
    lyricsView.innerHTML = `<h2 style="font-size: 13px; font-weight: 800; margin-bottom: 60px; color: #fff; opacity: 0.5; letter-spacing: 0.2em;">LYRICS</h2>`;
    mockLyrics.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.textContent = line;
        p.id = `lyric-${index}`;
        lyricsView.appendChild(p);
    });
}

function updateLyricsSync() {
    if (lyricsView.style.display !== 'flex') return;
    const lines = document.querySelectorAll('.lyric-line');
    const index = Math.min(mockLyrics.length - 1, Math.floor((audio.currentTime / audio.duration) * mockLyrics.length));
    lines.forEach(l => l.classList.remove('active'));
    const activeLine = document.getElementById(`lyric-${index}`);
    if (activeLine) {
        activeLine.classList.add('active');
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Full Screen Mode
toggleFullScreenBtn.onclick = () => {
    if (!currentTrack) return;
    fullScreenOverlay.style.display = 'flex';
    document.getElementById('fs-album-art').src = currentTrack.artworkUrl100.replace('100x100', '600x600');
    document.getElementById('fs-title').textContent = currentTrack.trackName;
    document.getElementById('fs-artist').textContent = currentTrack.artistName;
    toggleFullScreenBtn.style.color = 'var(--text-bright-accent)';
};

closeFullScreenBtn.onclick = () => {
    fullScreenOverlay.style.display = 'none';
    toggleFullScreenBtn.style.color = 'var(--text-subdued)';
};

// --- Home Rendering ---
function renderHome() {
    const homeGrid = document.getElementById('home-grid');
    const mockData = [
        { trackId: 'm1', trackName: 'Today\'s Top Hits', artistName: 'Grigorii Gainaru & Vergiliu Zagorodniuc', artworkUrl100: 'https://picsum.photos/seed/hits/400/400', previewUrl: '' },
        { trackId: 'm2', trackName: 'Jazz Classics', artistName: 'Gentle Piano', artworkUrl100: 'https://picsum.photos/seed/jazz/400/400', previewUrl: '' },
        { trackId: 'm3', trackName: 'Rock Legends', artistName: 'Masterpieces', artworkUrl100: 'https://picsum.photos/seed/rock/400/400', previewUrl: '' },
        { trackId: 'm4', trackName: 'Chill Vibes', artistName: 'Liquid Gold', artworkUrl100: 'https://picsum.photos/seed/chill/400/400', previewUrl: '' },
        { trackId: 'm5', trackName: 'Night Rider', artistName: 'BMW Lights Night', artworkUrl100: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=400&fit=crop', previewUrl: '' },
        { trackId: 'm6', trackName: 'Pop Rising', artistName: 'Daily Dose', artworkUrl100: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop', previewUrl: '' }
    ];

    homeGrid.innerHTML = '';
    mockData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.artworkUrl100}" alt="${item.trackName}">
            <div class="card-title">${item.trackName}</div>
            <p class="card-description">${item.artistName}</p>
        `;
        card.onclick = () => renderPlaylist(item.trackName.toLowerCase().includes('chill') ? 'chill' : 'other');
        homeGrid.appendChild(card);
    });
}

// --- Playlist View Logic ---
async function renderPlaylist(type) {
    const titleEl = document.getElementById('playlist-title');
    const imgEl = document.getElementById('playlist-img');
    const trackCountEl = document.getElementById('playlist-track-count');
    const tracksContainer = document.getElementById('playlist-tracks');
    
    let tracks = [];
    if (type === 'liked') {
        titleEl.textContent = 'Liked Songs';
        imgEl.src = 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop';
        tracks = likedSongs;
    } else {
        titleEl.textContent = 'Chill Vibes';
        imgEl.src = 'https://picsum.photos/seed/playlist/400/400';
        const response = await fetch(`https://itunes.apple.com/search?term=chill&media=music&limit=15`);
        const data = await response.json();
        tracks = data.results;
    }

    currentQueue = tracks; // Sync playback context
    if (isShuffle) shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);

    trackCountEl.textContent = `${tracks.length} songs`;
    tracksContainer.innerHTML = '';

    tracks.forEach((track, index) => {
        const isLiked = likedSongs.some(s => s.trackId === track.trackId);
        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
            <span>${index + 1}</span>
            <div style="display: flex; gap: 14px; align-items: center;">
                <img src="${track.artworkUrl100}" style="width: 44px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <div style="display: flex; flex-direction: column;">
                    <span class="track-title">${track.trackName}</span>
                    <span style="font-size: 13px; opacity: 0.6;">${track.artistName}</span>
                </div>
            </div>
            <span style="font-size: 13px;">${track.collectionName || 'Single'}</span>
            <div style="display: flex; gap: 14px; align-items: center;">
                <i data-lucide="heart" class="${isLiked ? 'active-heart' : ''}" style="width: 18px; cursor: pointer;" onclick="event.stopPropagation(); toggleLikeById('${track.trackId}')"></i>
                <span style="font-size: 13px;">3:45</span>
            </div>
        `;
        row.onclick = () => playTrack(track);
        tracksContainer.appendChild(row);
    });

    updateIcons();
    showView('playlist-view');
}

// --- Like System ---
function toggleLike(track) {
    const index = likedSongs.findIndex(s => s.trackId === track.trackId);
    if (index === -1) {
        likedSongs.push(track);
    } else {
        likedSongs.splice(index, 1);
    }
    localStorage.setItem('spotify_liked_songs', JSON.stringify(likedSongs));
    
    if (document.getElementById('playlist-view').style.display === 'block' && 
        document.getElementById('playlist-title').textContent === 'Liked Songs') {
        renderPlaylist('liked');
    }
}

window.toggleLikeById = async function(id) {
    let track = likedSongs.find(s => s.trackId == id);
    if (!track) {
        const response = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
        const data = await response.json();
        track = data.results[0];
    }
    if (track) toggleLike(track);
    updatePlayerHeartUI();
}

function updatePlayerHeartUI() {
    if (!currentTrack) return;
    const isLiked = likedSongs.some(s => s.trackId === currentTrack.trackId);
    playerHeartBtn.classList.toggle('active-heart', isLiked);
    playerHeartBtn.innerHTML = `<i data-lucide="heart" fill="${isLiked ? '#1ed760' : 'none'}" size="20"></i>`;
    updateIcons();
}

playerHeartBtn.onclick = () => { if (currentTrack) { toggleLike(currentTrack); updatePlayerHeartUI(); } };

// --- Playback Logic ---
function playTrack(track) {
    currentTrack = track;
    audio.src = track.previewUrl;
    audio.play();

    nowPlayingImg.src = track.artworkUrl100.replace('100x100', '400x400');
    nowPlayingTitle.textContent = track.trackName;
    nowPlayingArtist.textContent = track.artistName;
    
    // Sync FS view if open
    document.getElementById('fs-album-art').src = track.artworkUrl100.replace('100x100', '600x600');
    document.getElementById('fs-title').textContent = track.trackName;
    document.getElementById('fs-artist').textContent = track.artistName;

    updatePlayerHeartUI();
    updateIcons();
}

playPauseBtn.addEventListener('click', () => { if (!audio.src) return; isPlaying ? audio.pause() : audio.play(); });
fsPlayPauseBtn.addEventListener('click', () => { if (!audio.src) return; isPlaying ? audio.pause() : audio.play(); });

audio.onplay = () => { 
    isPlaying = true; 
    playPauseIcon.setAttribute('data-lucide', 'pause'); 
    fsPlayPauseBtn.querySelector('i').setAttribute('data-lucide', 'pause');
    updateIcons(); 
};
audio.onpause = () => { 
    isPlaying = false; 
    playPauseIcon.setAttribute('data-lucide', 'play'); 
    fsPlayPauseBtn.querySelector('i').setAttribute('data-lucide', 'play');
    updateIcons(); 
};
audio.ontimeupdate = () => {
    const progress = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = `${progress}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    if (!isNaN(audio.duration)) totalTimeEl.textContent = formatTime(audio.duration);
    updateLyricsSync();
};

audio.onended = () => {
    playNext(true);
};

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// --- Search Implementation ---
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('search-results-container');
    const browseAll = document.getElementById('browse-all-container');

    if (query.length < 2) { resultsContainer.style.display = 'none'; browseAll.style.display = 'block'; return; }

    searchTimeout = setTimeout(async () => {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=24`);
        const data = await response.json();
        browseAll.style.display = 'none';
        resultsContainer.style.display = 'block';
        
        currentQueue = data.results; // Sync search context
        if (isShuffle) shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);

        const grid = document.getElementById('search-grid');
        grid.innerHTML = '';
        data.results.forEach(track => {
            const isLiked = likedSongs.some(s => s.trackId === track.trackId);
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${track.artworkUrl100.replace('100x100', '400x400')}" alt="${track.trackName}">
                <div class="card-title">${track.trackName}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p class="card-description">${track.artistName}</p>
                    <i data-lucide="heart" class="${isLiked ? 'active-heart' : ''}" style="width: 18px; cursor: pointer; transition: transform 0.2s;" onclick="event.stopPropagation(); toggleLikeById('${track.trackId}')"></i>
                </div>
            `;
            card.onclick = () => playTrack(track);
            grid.appendChild(card);
        });
        updateIcons();
    }, 400);
});

init();
