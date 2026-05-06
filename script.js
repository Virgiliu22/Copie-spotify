let users = JSON.parse(localStorage.getItem("spotify_users")) || [];
let currentUser = JSON.parse(localStorage.getItem("spotify_current_user")) || null;

function createDefaultUser(username, password) {
    return {
        id: Date.now().toString(),
        username,
        password,
        avatar: "images/avatar.jpg",
        followers: Math.floor(Math.random() * 300) + 50,
        following: Math.floor(Math.random() * 120) + 20,
        likedSongs: [],
        customPlaylists: [
            {
                id: "favorites",
                name: "Favorite Songs",
                image: "images/favorite_songs.jpg",
                tracks: []
            },
            {
                id: "chill",
                name: "Chill Vibes",
                image: "images/chill_vibes.jpg",
                query: "chill vibes",
                tracks: []
            }
        ]
    };
}

function saveUsers() {
    localStorage.setItem("spotify_users", JSON.stringify(users));
}

function saveCurrentUser() {
    localStorage.setItem("spotify_current_user", JSON.stringify(currentUser));
}

function syncCurrentUserInUsers() {
    if (!currentUser) return;

    const index = users.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
        users[index] = currentUser;
        saveUsers();
        saveCurrentUser();
    }
}

function registerUser(username, password) {
    const messageEl = document.getElementById("auth-message");

    if (!username || !password) {
        if (messageEl) messageEl.textContent = "Complete username and password.";
        return;
    }

    const exists = users.some(user => user.username.toLowerCase() === username.toLowerCase());
    if (exists) {
        if (messageEl) messageEl.textContent = "This username already exists.";
        return;
    }

    const newUser = createDefaultUser(username, password);
    users.push(newUser);
    currentUser = newUser;
    saveUsers();
    saveCurrentUser();
    hideAuth();
    afterLoginSetup();
}

function loginUser(username, password) {
    const messageEl = document.getElementById("auth-message");

    if (!username || !password) {
        if (messageEl) messageEl.textContent = "Complete username and password.";
        return;
    }

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        if (messageEl) messageEl.textContent = "Wrong username or password.";
        return;
    }

    currentUser = user;
    saveCurrentUser();
    hideAuth();
    afterLoginSetup();
}

function logoutUser() {
    if (audio) audio.pause();
    isPlaying = false;
    currentTrack = null;
    localStorage.removeItem("spotify_current_user");
    currentUser = null;
    showAuth();
}

function showAuth() {
    const overlay = document.getElementById("auth-overlay");
    if (overlay) overlay.style.display = "flex";
}

function hideAuth() {
    const overlay = document.getElementById("auth-overlay");
    if (overlay) overlay.style.display = "none";
}

let isPlaying = false;
let currentTrack = null;
let currentPlaylistContext = null;

let isShuffle = false;
let repeatMode = 0;
let currentQueue = [];
let shuffledQueue = [];

let viewHistory = [];
let forwardHistory = [];

const categoryImages = {
    "podcasts": "images/podcasts.jpg",
    "made for you": "images/made_for_you.jpg",
    "new releases": "images/new_releases.jpg",
    "pop": "images/pop.jpg",
    "chill": "images/chill_vibes.jpg",
    "chill vibes": "images/chill_vibes.jpg"
};

const audio = document.getElementById("spotify-audio");
const playPauseBtn = document.getElementById("play-pause-btn-main");
const progressFill = document.querySelector(".progress-fill");
const currentTimeEl = document.querySelector(".progress-bar-container span:first-child");
const totalTimeEl = document.querySelector(".progress-bar-container span:last-child");

const nowPlayingImg = document.querySelector(".now-playing img");
const nowPlayingTitle = document.getElementById("current-track-title");
const nowPlayingArtist = document.getElementById("current-track-artist");
const playerHeartBtn = document.getElementById("player-heart-btn");

const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const searchInput = document.getElementById("spotify-search");

const shuffleBtn = document.getElementById("shuffle-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const repeatBtn = document.getElementById("repeat-btn");

const volumeSlider = document.getElementById("volume-slider");
const lyricsView = document.getElementById("lyrics-view");
const toggleLyricsBtn = document.getElementById("toggle-lyrics");
const fullScreenOverlay = document.getElementById("full-screen-overlay");
const toggleFullScreenBtn = document.getElementById("toggle-fullscreen");
const closeFullScreenBtn = document.getElementById("close-fullscreen");
const premiumModal = document.getElementById("premium-modal");
const explorePremiumBtn = document.getElementById("explore-premium-btn");
const closePremiumBtn = document.getElementById("close-premium");

const fsPlayPauseBtn = document.getElementById("fs-play-pause");
const fsPrevBtn = document.getElementById("fs-prev-btn");
const fsNextBtn = document.getElementById("fs-next-btn");
const fsShuffleBtn = document.getElementById("fs-shuffle-btn");
const fsRepeatBtn = document.getElementById("fs-repeat-btn");

const headerNavButtons = document.querySelectorAll("header .circle-nav-btn");
const headerBackBtn = headerNavButtons[0] || null;
const headerForwardBtn = headerNavButtons[1] || null;

function getLikedSongs() {
    return currentUser ? currentUser.likedSongs : [];
}

function setLikedSongs(songs) {
    if (!currentUser) return;

    currentUser.likedSongs = songs;

    const favoritesPlaylist = currentUser.customPlaylists.find(p => p.id === "favorites");
    if (favoritesPlaylist) {
        favoritesPlaylist.tracks = songs;
    }

    syncCurrentUserInUsers();
    renderSidebarPlaylists();
    updateProfileUI();
}

function getCustomPlaylists() {
    return currentUser ? currentUser.customPlaylists : [];
}

function findPlaylistById(id) {
    return getCustomPlaylists().find(p => p.id === id);
}

function updateProfileUI() {
    if (!currentUser) return;

    const profileName = document.getElementById("profile-name");
    const profileAvatar = document.getElementById("profile-avatar-img");
    const profilePlaylists = document.getElementById("profile-playlists");
    const profileFollowers = document.getElementById("profile-followers");
    const profileFollowing = document.getElementById("profile-following");
    const userBtn = document.getElementById("user-btn");

    if (profileName) profileName.textContent = currentUser.username;
    if (profileAvatar) profileAvatar.src = currentUser.avatar;
    if (profilePlaylists) profilePlaylists.textContent = `${getCustomPlaylists().length} Playlists`;
    if (profileFollowers) profileFollowers.textContent = `${currentUser.followers} Followers`;
    if (profileFollowing) profileFollowing.textContent = `${currentUser.following} Following`;

    if (userBtn) {
        userBtn.innerHTML = `
            <img src="${currentUser.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        `;
    }
}

function renderSidebarPlaylists() {
    const container = document.getElementById("sidebar-playlists");
    if (!container || !currentUser) return;

    const playlists = getCustomPlaylists();
    container.innerHTML = "";

    playlists.forEach(playlist => {
        const item = document.createElement("div");
        item.className = "sidebar-playlist-item";
        item.innerHTML = `
            <img src="${playlist.image}" alt="${playlist.name}" onerror="this.src='images/chill_vibes.jpg'">
            <div class="sidebar-playlist-text">
                <span class="sidebar-playlist-name">${playlist.name}</span>
                <span class="sidebar-playlist-meta">Playlist • ${(playlist.tracks || []).length} songs</span>
            </div>
        `;

        item.addEventListener("click", async () => {
            if (playlist.id === "favorites") {
                renderCustomPlaylist("favorites", "#5038a0");
                return;
            }

            if (playlist.query && (!playlist.tracks || playlist.tracks.length === 0)) {
                await loadQueryPlaylistIntoUser(playlist.id, playlist.query);
            }

            renderCustomPlaylist(playlist.id, playlist.id === "chill" ? "#4687d7" : "#1db954");
        });

        container.appendChild(item);
    });

    updateIcons();
}

async function loadQueryPlaylistIntoUser(playlistId, query) {
    const playlist = findPlaylistById(playlistId);
    if (!playlist) return;

    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=25`);
        const data = await response.json();
        playlist.tracks = data.results || [];
        syncCurrentUserInUsers();
        renderSidebarPlaylists();
    } catch (error) {
        console.error("Playlist load error:", error);
    }
}

function createPlaylist(name) {
    if (!currentUser || !name) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    currentUser.customPlaylists.push({
        id: `playlist_${Date.now()}`,
        name: trimmedName,
        image: "images/chill_vibes.jpg",
        tracks: []
    });

    syncCurrentUserInUsers();
    renderSidebarPlaylists();
    updateProfileUI();
}

function addTrackToPlaylist(track, playlistId) {
    if (!track || !playlistId || !currentUser) return;

    const playlist = findPlaylistById(playlistId);
    if (!playlist) return;

    const exists = playlist.tracks.some(t => t.trackId === track.trackId);
    if (exists) {
        alert("Song already in playlist.");
        return;
    }

    playlist.tracks.push(track);
    syncCurrentUserInUsers();
    renderSidebarPlaylists();

    if (currentPlaylistContext && currentPlaylistContext.type === "custom" && currentPlaylistContext.id === playlistId) {
        renderCustomPlaylist(playlistId, "#1db954");
    }

    alert(`Added to ${playlist.name}`);
}

function init() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    setupAuthTabs();
    setupAuthSubmit();
    attachBaseEvents();

    if (volumeSlider && audio) {
        audio.volume = volumeSlider.value / 100;
    }

    if (!currentUser) {
        showAuth();
        return;
    }

    afterLoginSetup();
}

function afterLoginSetup() {
    if (!currentUser) return;

    const favoritesPlaylist = currentUser.customPlaylists.find(p => p.id === "favorites");
    if (favoritesPlaylist) {
        favoritesPlaylist.tracks = currentUser.likedSongs || [];
    }

    updateProfileUI();
    renderSidebarPlaylists();
    renderHome();
    showView("home-view", false);
    updatePlayerHeartUI();
    updateIcons();
}

function updateIcons() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

let authMode = "login";

function setupAuthTabs() {
    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");
    const submitBtn = document.getElementById("auth-submit-btn");
    const messageEl = document.getElementById("auth-message");

    if (!loginTab || !registerTab || !submitBtn || !messageEl) return;

    loginTab.addEventListener("click", () => {
        authMode = "login";
        loginTab.classList.add("active");
        registerTab.classList.remove("active");
        submitBtn.textContent = "Login";
        messageEl.textContent = "";
    });

    registerTab.addEventListener("click", () => {
        authMode = "register";
        registerTab.classList.add("active");
        loginTab.classList.remove("active");
        submitBtn.textContent = "Register";
        messageEl.textContent = "";
    });
}

function setupAuthSubmit() {
    const submitBtn = document.getElementById("auth-submit-btn");
    const usernameInput = document.getElementById("auth-username");
    const passwordInput = document.getElementById("auth-password");

    if (!submitBtn || !usernameInput || !passwordInput) return;

    submitBtn.addEventListener("click", () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (authMode === "login") {
            loginUser(username, password);
        } else {
            registerUser(username, password);
        }
    });

    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                submitBtn.click();
            }
        });
    });
}

function showView(viewId, addToHistory = true) {
    const currentVisibleView = Array.from(views).find(v => v.style.display === "block");

    if (addToHistory && currentVisibleView && currentVisibleView.id !== viewId) {
        viewHistory.push(currentVisibleView.id);
        forwardHistory = [];
    }

    views.forEach(v => {
        v.style.display = "none";
    });

    if (lyricsView) {
        lyricsView.style.display = "none";
    }

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = "block";
    }

    navItems.forEach(item => {
        item.classList.remove("active");
        if (item.id === `nav-${viewId.split("-")[0]}`) {
            item.classList.add("active");
        }
    });

    window.scrollTo(0, 0);
}

function attachBaseEvents() {
    const navHome = document.getElementById("nav-home");
    const navSearch = document.getElementById("nav-search");
    const goProfile = document.getElementById("go-profile");
    const userBtn = document.getElementById("user-btn");
    const logoutBtn = document.getElementById("do-logout");
    const createPlaylistBtn = document.getElementById("create-playlist-btn");
    const addCurrentToPlaylistBtn = document.getElementById("add-current-to-playlist");

    if (navHome) {
        navHome.addEventListener("click", () => {
            if (!currentUser) return;
            showView("home-view");
        });
    }

    if (navSearch) {
        navSearch.addEventListener("click", () => {
            if (!currentUser) return;
            showView("search-view");
        });
    }

    if (goProfile) {
        goProfile.addEventListener("click", () => {
            if (!currentUser) return;
            showView("profile-view");
        });
    }

    if (headerBackBtn) {
        headerBackBtn.addEventListener("click", () => {
            const currentVisibleView = Array.from(views).find(v => v.style.display === "block");
            if (!viewHistory.length) return;

            const previousView = viewHistory.pop();
            if (currentVisibleView) {
                forwardHistory.push(currentVisibleView.id);
            }

            showView(previousView, false);
        });
    }

    if (headerForwardBtn) {
        headerForwardBtn.addEventListener("click", () => {
            const currentVisibleView = Array.from(views).find(v => v.style.display === "block");
            if (!forwardHistory.length) return;

            const nextView = forwardHistory.pop();
            if (currentVisibleView) {
                viewHistory.push(currentVisibleView.id);
            }

            showView(nextView, false);
        });
    }

    if (userBtn) {
        userBtn.addEventListener("click", e => {
            e.stopPropagation();
            if (!currentUser) return;

            const dropdown = document.getElementById("user-dropdown");
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
            }
        });
    }

    document.addEventListener("click", () => {
        const dropdown = document.getElementById("user-dropdown");
        if (dropdown) {
            dropdown.style.display = "none";
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logoutUser);
    }

    if (createPlaylistBtn) {
        createPlaylistBtn.addEventListener("click", () => {
            if (!currentUser) return;
            const name = prompt("Playlist name:");
            if (name) createPlaylist(name);
        });
    }

    if (addCurrentToPlaylistBtn) {
        addCurrentToPlaylistBtn.addEventListener("click", () => {
            if (!currentTrack || !currentUser) {
                alert("Play a song first.");
                return;
            }

            const playlists = getCustomPlaylists().filter(p => p.id !== "favorites");
            if (playlists.length === 0) {
                alert("Create a playlist first.");
                return;
            }

            const names = playlists.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
            const choice = prompt(`Choose playlist number:\n${names}`);
            const index = Number(choice) - 1;

            if (playlists[index]) {
                addTrackToPlaylist(currentTrack, playlists[index].id);
            }
        });
    }

    if (explorePremiumBtn && premiumModal) {
        explorePremiumBtn.onclick = () => {
            premiumModal.style.display = "flex";
        };
    }

    if (closePremiumBtn && premiumModal) {
        closePremiumBtn.onclick = () => {
            premiumModal.style.display = "none";
        };

        premiumModal.onclick = e => {
            if (e.target === premiumModal) {
                premiumModal.style.display = "none";
            }
        };
    }

    if (volumeSlider && audio) {
        volumeSlider.addEventListener("input", e => {
            audio.volume = e.target.value / 100;
        });
    }

    setupPlaybackEvents();
    setupSearch();
    setupLyrics();
    setupFullscreen();
}

function setupPlaybackEvents() {
    if (shuffleBtn) shuffleBtn.onclick = toggleShuffle;
    if (fsShuffleBtn) fsShuffleBtn.onclick = toggleShuffle;
    if (repeatBtn) repeatBtn.onclick = toggleRepeat;
    if (fsRepeatBtn) fsRepeatBtn.onclick = toggleRepeat;

    if (nextBtn) nextBtn.onclick = () => playNext();
    if (fsNextBtn) fsNextBtn.onclick = () => playNext();
    if (prevBtn) prevBtn.onclick = () => playPrev();
    if (fsPrevBtn) fsPrevBtn.onclick = () => playPrev();

    if (playPauseBtn) {
        playPauseBtn.addEventListener("click", () => {
            if (!audio || !audio.src) return;
            if (isPlaying) audio.pause();
            else audio.play();
        });
    }

    if (fsPlayPauseBtn) {
        fsPlayPauseBtn.addEventListener("click", () => {
            if (!audio || !audio.src) return;
            if (isPlaying) audio.pause();
            else audio.play();
        });
    }

    if (!audio) return;

    audio.onplay = () => {
        isPlaying = true;
        updatePlayPauseUI();
    };

    audio.onpause = () => {
        isPlaying = false;
        updatePlayPauseUI();
    };

    audio.ontimeupdate = () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        if (progressFill) progressFill.style.width = `${progress || 0}%`;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
        if (totalTimeEl && !isNaN(audio.duration)) totalTimeEl.textContent = formatTime(audio.duration);
        updateLyricsSync();
    };

    audio.onended = () => {
        playNext(true);
    };

    const progressBar = document.querySelector(".progress-bar");
    if (progressBar) {
        progressBar.addEventListener("click", e => {
            if (!audio.duration) return;
            const bar = e.currentTarget;
            const rect = bar.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const percentage = x / width;
            audio.currentTime = percentage * audio.duration;
        });
    }

    if (playerHeartBtn) {
        playerHeartBtn.onclick = () => {
            if (currentTrack) {
                toggleLike(currentTrack);
                updatePlayerHeartUI();
            }
        };
    }
}

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
    if (shuffleBtn) shuffleBtn.classList.toggle("control-active", isShuffle);
    if (fsShuffleBtn) fsShuffleBtn.classList.toggle("control-active", isShuffle);

    if (repeatBtn) repeatBtn.classList.toggle("control-active", repeatMode > 0);
    if (fsRepeatBtn) fsRepeatBtn.classList.toggle("control-active", repeatMode > 0);

    const repeatIcon = repeatMode === 2 ? "repeat-1" : "repeat";

    if (repeatBtn) repeatBtn.innerHTML = `<i data-lucide="${repeatIcon}" size="18"></i>`;
    if (fsRepeatBtn) fsRepeatBtn.innerHTML = `<i data-lucide="${repeatIcon}" size="24"></i>`;

    updateIcons();
}

function playNext(auto = false) {
    if (!currentTrack) return;

    if (repeatMode === 2 && auto) {
        playTrack(currentTrack);
        return;
    }

    const queue = isShuffle ? shuffledQueue : currentQueue;
    if (queue.length === 0) return;

    let nextIdx = queue.findIndex(t => t.trackId === currentTrack.trackId) + 1;

    if (nextIdx >= queue.length) {
        if (repeatMode === 1) {
            nextIdx = 0;
        } else {
            if (auto && audio) {
                audio.pause();
                isPlaying = false;
                updatePlayPauseUI();
            }
            return;
        }
    }

    playTrack(queue[nextIdx]);
}

function playPrev() {
    if (!audio) return;

    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }

    const queue = isShuffle ? shuffledQueue : currentQueue;
    if (queue.length === 0 || !currentTrack) return;

    let prevIdx = queue.findIndex(t => t.trackId === currentTrack.trackId) - 1;

    if (prevIdx < 0) {
        if (repeatMode === 1) {
            prevIdx = queue.length - 1;
        } else {
            return;
        }
    }

    playTrack(queue[prevIdx]);
}

const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.lunar.icu",
    "https://piped-api.garudalinux.org",
    "https://api.piped.projectsegfau.lt"
];

async function fetchFullAudioUrl(trackName, artistName) {
    const cleanTitle = trackName.split('(')[0].split('-')[0].trim();
    const cleanArtist = artistName.split(',')[0].split('&')[0].trim();
    const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);

    for (const instance of pipedInstances) {
        try {
            // Search for the video
            const searchRes = await fetch(`${instance}/search?q=${query}&filter=videos`, {
                signal: AbortSignal.timeout(3000)
            });
            if (!searchRes.ok) continue;

            const searchData = await searchRes.json();
            const video = (searchData.items || []).find(item =>
                item.title.toLowerCase().includes(cleanTitle.toLowerCase()) ||
                item.uploaderName.toLowerCase().includes(cleanArtist.toLowerCase())
            ) || searchData.items[0];

            if (!video || !video.url) continue;
            const videoId = video.url.split("v=")[1];

            // Get streams for the video
            const streamRes = await fetch(`${instance}/streams/${videoId}`, {
                signal: AbortSignal.timeout(3000)
            });
            if (!streamRes.ok) continue;

            const streamData = await streamRes.json();
            const audioStream = (streamData.audioStreams || [])
                .sort((a, b) => b.bitrate - a.bitrate)[0];

            if (audioStream && audioStream.url) {
                return audioStream.url;
            }
        } catch (e) {
            console.warn(`Piped instance ${instance} failed:`, e);
        }
    }
    return null;
}

async function playTrack(track) {
    if (!track || !audio) return;

    currentTrack = track;
    const artwork = (track.artworkUrl100 || "images/chill_vibes.jpg").replace("100x100", "400x400");

    // UI Early Update
    if (nowPlayingImg) nowPlayingImg.src = artwork;
    if (nowPlayingTitle) nowPlayingTitle.textContent = track.trackName || "Unknown";
    if (nowPlayingArtist) nowPlayingArtist.textContent = track.artistName || "-";

    const fsAlbumArt = document.getElementById("fs-album-art");
    const fsTitle = document.getElementById("fs-title");
    const fsArtist = document.getElementById("fs-artist");

    if (fsAlbumArt) fsAlbumArt.src = artwork.replace("400x400", "600x600");
    if (fsTitle) fsTitle.textContent = track.trackName || "";
    if (fsArtist) fsArtist.textContent = track.artistName || "";

    // Set preview as initial source so it starts fast
    if (track.previewUrl) {
        audio.src = track.previewUrl;
        audio.play().catch(() => { });
    }

    // Try to upgrade to full song
    console.log("Attempting to fetch full track...");
    const fullUrl = await fetchFullAudioUrl(track.trackName, track.artistName);

    if (fullUrl) {
        console.log("Full track found! Switching audio source.");
        const currentTime = audio.currentTime;
        audio.src = fullUrl;
        audio.currentTime = currentTime; // Preserve position if possible (though for 30s it's small)
        audio.play().catch(() => { });
    } else {
        console.warn("Full track not found, sticking with preview.");
    }

    updatePlayerHeartUI();
    updateIcons();
}

function updatePlayPauseUI() {
    const icon = isPlaying ? "pause" : "play";

    if (playPauseBtn) {
        playPauseBtn.innerHTML = `<i data-lucide="${icon}" fill="black" size="20"></i>`;
    }

    if (fsPlayPauseBtn) {
        fsPlayPauseBtn.innerHTML = `<i data-lucide="${icon}" fill="#000" size="36"></i>`;
    }

    updateIcons();
}

function renderHome() {
    const homeGrid = document.getElementById("home-grid");
    if (!homeGrid) return;

    const mockData = [
        { trackId: "m1", trackName: "Today's Top Hits", artistName: "Various Artists", artworkUrl100: "images/hits.jpg", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { trackId: "m2", trackName: "Jazz Classics", artistName: "Gentle Piano", artworkUrl100: "images/jazz.jpg", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { trackId: "m3", trackName: "Rock Legends", artistName: "Masterpieces", artworkUrl100: "images/rock.jpg", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
        { trackId: "m4", trackName: "Chill Vibes", artistName: "Liquid Gold", artworkUrl100: "images/chill_vibes.jpg", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
        { trackId: "m5", trackName: "Night Rider", artistName: "BMW Lights Night", artworkUrl100: "images/night_rider.jpg", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
        { trackId: "m6", trackName: "Pop Rising", artistName: "Daily Dose", artworkUrl100: "images/made_for_you.jpg", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
    ];

    homeGrid.innerHTML = "";

    mockData.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${item.artworkUrl100}" alt="${item.trackName}">
            <div class="card-title">${item.trackName}</div>
            <p class="card-description">${item.artistName}</p>
        `;

        card.onclick = () => {
            const title = item.trackName.toLowerCase();
            if (title.includes("chill")) renderPlaylist("chill", "#4687d7");
            else if (title.includes("pop")) renderPlaylist("pop", "#2d46b9");
            else renderPlaylist(title, "#1db954");
        };

        homeGrid.appendChild(card);
    });
}

async function renderPlaylist(type, color = "#1db954") {
    const titleEl = document.getElementById("playlist-title");
    const imgEl = document.getElementById("playlist-img");
    const trackCountEl = document.getElementById("playlist-track-count");
    const tracksContainer = document.getElementById("playlist-tracks");
    const ownerEl = document.getElementById("playlist-owner");
    const playlistHeader = document.querySelector(".playlist-header");

    if (playlistHeader) {
        playlistHeader.style.background = `linear-gradient(to bottom, ${color}99, var(--background-elevated-base))`;
    }

    let tracks = [];
    let playlistName = type.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    let image = categoryImages[type] || "images/chill_vibes.jpg";

    if (titleEl) titleEl.textContent = playlistName;
    if (imgEl) imgEl.src = image;
    if (ownerEl) ownerEl.textContent = currentUser ? currentUser.username : "User";

    if (tracksContainer) {
        tracksContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-subdued);">Loading songs...</div>`;
    }

    showView("playlist-view");

    try {
        const searchTerm = type === "made for you" ? "hits" : type === "new releases" ? "2024 hits" : type;
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=25`);
        const data = await response.json();
        tracks = data.results || [];
    } catch (error) {
        console.error(error);
        tracks = [];
    }

    currentPlaylistContext = { type: "api", id: type };
    currentQueue = tracks;
    if (isShuffle) shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);

    if (trackCountEl) trackCountEl.textContent = `${tracks.length} songs`;
    if (tracksContainer) tracksContainer.innerHTML = "";

    tracks.forEach((track, index) => {
        const isLiked = getLikedSongs().some(s => s.trackId === track.trackId);
        const row = createTrackRow(track, index, isLiked);
        if (tracksContainer) tracksContainer.appendChild(row);
    });

    updateIcons();
    showView("playlist-view");
}

function renderCustomPlaylist(playlistId, color = "#1db954") {
    const playlist = findPlaylistById(playlistId);
    if (!playlist) return;

    const titleEl = document.getElementById("playlist-title");
    const imgEl = document.getElementById("playlist-img");
    const trackCountEl = document.getElementById("playlist-track-count");
    const tracksContainer = document.getElementById("playlist-tracks");
    const ownerEl = document.getElementById("playlist-owner");
    const playlistHeader = document.querySelector(".playlist-header");

    if (playlistHeader) {
        playlistHeader.style.background = `linear-gradient(to bottom, ${color}99, var(--background-elevated-base))`;
    }

    if (titleEl) titleEl.textContent = playlist.name;
    if (imgEl) imgEl.src = playlist.image || "images/chill_vibes.jpg";
    if (ownerEl) ownerEl.textContent = currentUser.username;

    const tracks = playlist.tracks || [];

    currentPlaylistContext = { type: "custom", id: playlistId };
    currentQueue = tracks;
    if (isShuffle) shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);

    if (trackCountEl) trackCountEl.textContent = `${tracks.length} songs`;
    if (tracksContainer) tracksContainer.innerHTML = "";

    if (tracks.length === 0) {
        if (tracksContainer) {
            tracksContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-subdued);">No songs in this playlist yet.</div>`;
        }
    } else {
        tracks.forEach((track, index) => {
            const isLiked = getLikedSongs().some(s => s.trackId === track.trackId);
            const row = createTrackRow(track, index, isLiked);
            if (tracksContainer) tracksContainer.appendChild(row);
        });
    }

    updateIcons();
    showView("playlist-view");
}

function createTrackRow(track, index, isLiked) {
    const row = document.createElement("div");
    row.className = `track-row ${isLiked ? "liked-track" : ""}`;
    row.dataset.trackId = track.trackId;
    row.innerHTML = `
        <span>${index + 1}</span>
        <div style="display: flex; gap: 14px; align-items: center;">
            <img src="${track.artworkUrl100}" style="width: 44px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <div style="display: flex; flex-direction: column;">
                <div>
                    <span class="track-title">${track.trackName}</span>
                    <i data-lucide="heart" class="mini-heart" size="12" fill="currentColor"></i>
                </div>
                <span style="font-size: 13px; opacity: 0.6;">${track.artistName}</span>
            </div>
        </div>
        <span>${track.collectionName || "Single"}</span>
        <div style="display: flex; gap: 14px; align-items: center; justify-content: flex-end;">
            <i data-lucide="heart" class="${isLiked ? "active-heart" : ""}" 
               fill="${isLiked ? "var(--text-bright-accent)" : "none"}"
               style="width: 18px; cursor: pointer;" 
               onclick="event.stopPropagation(); toggleLikeById('${track.trackId}')"></i>
            <span style="font-size: 13px;">${formatDuration(track.trackTimeMillis)}</span>
        </div>
    `;
    row.onclick = () => playTrack(track);
    return row;
}

function updateLikedUI() {
    if (!currentUser) return;
    const likedIds = new Set(getLikedSongs().map(s => String(s.trackId)));

    document.querySelectorAll(".track-row, .card").forEach(el => {
        const id = el.dataset.trackId;
        if (!id) return;

        const isLiked = likedIds.has(String(id));

        if (el.classList.contains("track-row")) {
            el.classList.toggle("liked-track", isLiked);
        } else if (el.classList.contains("card")) {
            el.classList.toggle("liked-card", isLiked);
        }

        const hearts = el.querySelectorAll('[data-lucide="heart"]');
        hearts.forEach(heart => {
            if (heart.classList.contains('mini-heart')) return;

            heart.classList.toggle("active-heart", isLiked);

            // Set fill attribute (works for both i and svg)
            const fillValue = isLiked ? "var(--text-bright-accent)" : "none";
            heart.setAttribute('fill', fillValue);

            // If it's an SVG, we might need to set the style property for fill too if setAttribute doesn't trigger redraw correctly
            if (heart.tagName.toLowerCase() === 'svg') {
                heart.style.fill = fillValue;
            }
        });
    });

    // Also update "Favorite Songs" playlist if it's currently open
    if (
        currentPlaylistContext &&
        currentPlaylistContext.type === "custom" &&
        currentPlaylistContext.id === "favorites"
    ) {
        renderCustomPlaylist("favorites", "#5038a0");
    }

    updatePlayerHeartUI();
    updateIcons();
}

function toggleLike(track) {
    if (!currentUser) return;

    const likedSongs = [...getLikedSongs()];
    const index = likedSongs.findIndex(s => s.trackId === track.trackId);

    if (index === -1) {
        likedSongs.push(track);
    } else {
        likedSongs.splice(index, 1);
    }

    setLikedSongs(likedSongs);
    updateLikedUI();
}

window.toggleLikeById = async function (id) {
    let track = getLikedSongs().find(s => String(s.trackId) === String(id));

    if (!track) {
        try {
            const response = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
            const data = await response.json();
            track = data.results[0];
        } catch (error) {
            console.error(error);
        }
    }

    if (track) {
        toggleLike(track);
    }
};

function updatePlayerHeartUI() {
    if (!currentTrack || !currentUser || !playerHeartBtn) return;

    const isLiked = getLikedSongs().some(s => s.trackId === currentTrack.trackId);
    playerHeartBtn.classList.toggle("active-heart", isLiked);
    playerHeartBtn.innerHTML = `<i data-lucide="heart" fill="${isLiked ? "#1ed760" : "none"}" size="20"></i>`;
    updateIcons();
}

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
    "Your playlists stay with your account",
    "Login, play and vibe all night!"
];

function openLyricsView() {
    if (!lyricsView) return;
    views.forEach(v => {
        v.style.display = "none";
    });
    lyricsView.style.display = "flex";
    if (toggleLyricsBtn) toggleLyricsBtn.style.color = "var(--text-bright-accent)";
    renderLyrics();
}

function closeLyricsView() {
    if (!lyricsView) return;
    lyricsView.style.display = "none";
    if (toggleLyricsBtn) toggleLyricsBtn.style.color = "var(--text-subdued)";
    showView("home-view");
}

function setupLyrics() {
    if (!toggleLyricsBtn || !lyricsView) return;

    toggleLyricsBtn.onclick = () => {
        if (lyricsView.style.display === "flex") {
            closeLyricsView();
        } else {
            openLyricsView();
        }
    };
}

let currentLyricsData = [];

async function renderLyrics() {
    if (!lyricsView || !currentTrack) return;

    // Premium Loading Header
    lyricsView.innerHTML = `
        <div class="lyrics-header">
            <div class="lyrics-title">${currentTrack.trackName}</div>
            <div class="lyrics-artist">Fetching original lyrics for ${currentTrack.artistName}...</div>
        </div>
        <div id="lyrics-loading" style="font-size: 24px; font-weight: 700; color: white; opacity: 0.6;">Searching LRCLIB database...</div>
    `;

    try {
        // Clean Title/Artist for better matching
        const cleanTitle = currentTrack.trackName.split('(')[0].split('-')[0].trim();
        const cleanArtist = currentTrack.artistName.split(',')[0].split('&')[0].trim();

        const artist = encodeURIComponent(cleanArtist);
        const title = encodeURIComponent(cleanTitle);

        const response = await fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}`);

        if (!response.ok) throw new Error("Lyrics not found");

        const data = await response.json();

        lyricsView.innerHTML = `
            <div class="lyrics-header">
                <div class="lyrics-title">${currentTrack.trackName}</div>
                <div class="lyrics-artist">${currentTrack.artistName}</div>
            </div>
        `;

        if (data.syncedLyrics) {
            currentLyricsData = parseSyncedLyrics(data.syncedLyrics);
        } else if (data.plainLyrics) {
            currentLyricsData = data.plainLyrics.split('\n').map(line => ({ text: line }));
        } else {
            throw new Error("Empty lyrics");
        }

        currentLyricsData.forEach((line, index) => {
            const p = document.createElement("p");
            p.className = "lyric-line";
            p.textContent = line.text || line;
            p.id = `lyric-${index}`;
            lyricsView.appendChild(p);
        });

        // Add credit
        const credit = document.createElement("div");
        credit.style = "margin-top: 60px; font-size: 13px; opacity: 0.4; color: white;";
        credit.textContent = "Lyrics provided by LRCLIB • Crowdsourced Community Database";
        lyricsView.appendChild(credit);

    } catch (error) {
        console.warn("Could not fetch real lyrics:", error);

        lyricsView.innerHTML = `
            <div class="lyrics-header">
                <div class="lyrics-title">${currentTrack.trackName}</div>
                <div class="lyrics-artist">${currentTrack.artistName}</div>
                <div style="margin-top: 12px; font-size: 14px; color: #ffbc2d; font-weight: 600;">Original lyrics not found. Using synchronized mock lyrics.</div>
            </div>
        `;

        // Final fallback to mock lyrics
        mockLyrics.forEach((line, index) => {
            const p = document.createElement("p");
            p.className = "lyric-line";
            p.textContent = line;
            p.id = `lyric-${index}`;
            lyricsView.appendChild(p);
        });
        currentLyricsData = mockLyrics.map(line => ({ text: line }));
    }
}

function parseSyncedLyrics(lrc) {
    const lines = lrc.split('\n');
    const result = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    lines.forEach(line => {
        const timeMatch = line.match(timeReg);
        if (timeMatch) {
            const text = line.replace(timeReg, "").trim();
            if (text) {
                const matches = line.matchAll(timeReg);
                for (const match of matches) {
                    const min = parseInt(match[1]);
                    const sec = parseInt(match[2]);
                    const ms = parseInt(match[3]);
                    const time = min * 60 + sec + ms / (match[3].length === 3 ? 1000 : 100);
                    result.push({ time, text });
                }
            }
        }
    });
    return result.sort((a, b) => a.time - b.time);
}

function updateLyricsSync() {
    if (!lyricsView || lyricsView.style.display !== "flex" || !audio || !audio.duration) return;

    let index = -1;
    const currentTime = audio.currentTime;

    if (currentLyricsData.length > 0 && currentLyricsData[0].time !== undefined) {
        // Use time-based sync
        for (let i = 0; i < currentLyricsData.length; i++) {
            if (currentTime >= currentLyricsData[i].time) {
                index = i;
            } else {
                break;
            }
        }
    } else {
        // Fallback to percentage-based sync (for plain lyrics or mock)
        index = Math.min(currentLyricsData.length - 1, Math.floor((currentTime / audio.duration) * currentLyricsData.length));
    }

    if (index !== -1) {
        const lines = document.querySelectorAll(".lyric-line");
        lines.forEach(l => l.classList.remove("active"));

        const activeLine = document.getElementById(`lyric-${index}`);
        if (activeLine) {
            activeLine.classList.add("active");
            activeLine.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }
}

function setupFullscreen() {
    if (toggleFullScreenBtn) {
        toggleFullScreenBtn.onclick = () => {
            if (!currentTrack || !fullScreenOverlay) return;

            fullScreenOverlay.style.display = "flex";

            const fsAlbumArt = document.getElementById("fs-album-art");
            const fsTitle = document.getElementById("fs-title");
            const fsArtist = document.getElementById("fs-artist");

            if (fsAlbumArt) fsAlbumArt.src = (currentTrack.artworkUrl100 || "images/chill_vibes.jpg").replace("100x100", "600x600");
            if (fsTitle) fsTitle.textContent = currentTrack.trackName || "";
            if (fsArtist) fsArtist.textContent = currentTrack.artistName || "";

            toggleFullScreenBtn.style.color = "var(--text-bright-accent)";
        };
    }

    if (closeFullScreenBtn) {
        closeFullScreenBtn.onclick = () => {
            if (fullScreenOverlay) fullScreenOverlay.style.display = "none";
            if (toggleFullScreenBtn) toggleFullScreenBtn.style.color = "var(--text-subdued)";
        };
    }
}

function setupSearch() {
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener("input", e => {
        clearTimeout(searchTimeout);

        const query = e.target.value.trim();
        const resultsContainer = document.getElementById("search-results-container");
        const browseAll = document.getElementById("browse-all-container");

        if (query.length < 2) {
            if (resultsContainer) resultsContainer.style.display = "none";
            if (browseAll) browseAll.style.display = "block";
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=24`);
                const data = await response.json();

                if (browseAll) browseAll.style.display = "none";
                if (resultsContainer) resultsContainer.style.display = "block";

                currentQueue = data.results || [];
                if (isShuffle) {
                    shuffledQueue = [...currentQueue].sort(() => Math.random() - 0.5);
                }

                const grid = document.getElementById("search-grid");
                if (!grid) return;

                grid.innerHTML = "";

                (data.results || []).forEach(track => {
                    const isLiked = getLikedSongs().some(s => s.trackId === track.trackId);

                    const card = document.createElement("div");
                    card.className = `card ${isLiked ? "liked-card" : ""}`;
                    card.dataset.trackId = track.trackId;
                    card.innerHTML = `
                        <img src="${track.artworkUrl100.replace("100x100", "400x400")}" alt="${track.trackName}">
                        <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                            <div class="card-title" style="margin-bottom: 0;">${track.trackName}</div>
                            <i data-lucide="heart" class="mini-heart" size="14" fill="currentColor"></i>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <p class="card-description">${track.artistName}</p>
                            <i data-lucide="heart" 
                               class="${isLiked ? "active-heart" : ""}" 
                               fill="${isLiked ? "var(--text-bright-accent)" : "none"}"
                               style="width: 18px; cursor: pointer; transition: transform 0.2s;" 
                               onclick="event.stopPropagation(); toggleLikeById('${track.trackId}')"></i>
                        </div>
                    `;

                    card.onclick = () => playTrack(track);
                    grid.appendChild(card);
                });

                updateIcons();
            } catch (error) {
                console.error("Search error:", error);
            }
        }, 400);
    });
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function formatDuration(ms) {
    if (!ms) return "0:30";
    const totalSeconds = Math.floor(ms / 1000);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

init();