// --- GLOBAL STATE ---
let libraryData = [];
let lastSearchResults = [];
let currentFilter = 'all';
const audio = new Audio();
let currentPlayBtn = null;

// --- UTILITIES & ERROR HANDLING ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `<span style="color: #1DB954; font-size: 18px;">✓</span> ${message}` : `<span style="color: #e22134; font-size: 18px;">✕</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

const PLACEHOLDER_ART = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
    '<rect width="100%" height="100%" fill="#181818"/>' +
    '<text x="50%" y="50%" fill="#727272" font-family="Arial" font-size="40" text-anchor="middle" dominant-baseline="middle">No Art</text></svg>'
);

function handleImgError(img) {
    if (img.src.includes('600x600bb')) {
        img.src = img.src.replace('600x600bb', '100x100bb');
    } else {
        img.onerror = null;
        img.src = PLACEHOLDER_ART;
    }
}

// Normalizes strings to ignore case, spaces, and punctuation for strict duplicate checking
const normalize = s => (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

function isDuplicate(song, artist) {
    const targetKey = `${normalize(song)}|${normalize(artist)}`;
    return libraryData.some(r => `${normalize(r.song)}|${normalize(r.artist)}` === targetKey);
}

function stopGlobalAudio() {
    audio.pause();
    document.querySelectorAll('.music-card.playing').forEach(c => c.classList.remove('playing'));
    document.querySelectorAll('.play-btn').forEach(b => b.innerHTML = '▶');
    currentPlayBtn = null;
}

// --- TAB NAVIGATION (With Memory) ---
const navLinks = document.querySelectorAll('.sidebar nav a');
const sections = document.querySelectorAll('.view-section');

function switchTab(targetId) {
    stopGlobalAudio(); 
    navLinks.forEach(l => l.classList.remove('active'));
    sections.forEach(sec => sec.classList.remove('active-view'));
    
    const activeLink = document.getElementById(`nav-${targetId}`);
    if (activeLink) activeLink.classList.add('active');
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add('active-view');
    
    localStorage.setItem('activeTab', targetId); 
}

if (navLinks.length > 0) {
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.getAttribute('href').substring(1));
        });
    });
    
    const savedTab = localStorage.getItem('activeTab') || 'search-section';
    switchTab(savedTab);
}

// --- AUDIO PLAYER ---
function toggleAudio(url, btnElement, cardElement) {
    if (!url) return showToast('No audio preview available for this track', 'error');

    if (audio.src === url && !audio.paused) {
        audio.pause();
        btnElement.innerHTML = '▶';
        cardElement.classList.remove('playing');
        return;
    }

    stopGlobalAudio(); 
    audio.src = url;
    audio.play();
    btnElement.innerHTML = '⏸';
    cardElement.classList.add('playing');
    currentPlayBtn = btnElement;

    audio.onended = () => {
        btnElement.innerHTML = '▶';
        cardElement.classList.remove('playing');
    };
}

// --- LIBRARY LOGIC ---
async function fetchLibrary() {
    try {
        const response = await fetch('/api/music?_=' + Date.now(), { cache: 'no-store' });
        libraryData = await response.json();
        renderLibrary();
        
        if (lastSearchResults.length > 0) renderSearchResults(lastSearchResults, 'search-results');
    } catch (e) { console.error('Error loading library:', e); }
}

function setFilter(filterType) {
    currentFilter = filterType;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    renderLibrary();
}

function renderLibrary() {
    const container = document.getElementById('playlist-container');
    if (!container) return;
    container.innerHTML = '';

    const filteredData = libraryData.filter(song => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'itunes') return song.previewUrl; 
        if (currentFilter === 'custom') return !song.previewUrl; 
    });

    filteredData.forEach((record, index) => {
        const card = createCardHTML(record, index);
        
        const actionDiv = document.createElement('div');
        actionDiv.style.marginTop = '10px';
        actionDiv.innerHTML = `<a href="edit.html?id=${record.id}">Edit</a>`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-secondary delete-btn';
        deleteBtn.style = 'padding: 6px 12px; border-color: #727272; background: transparent; color: white;';
        deleteBtn.innerText = 'Delete';
        deleteBtn.onclick = () => deleteSong(record.id);
        
        actionDiv.appendChild(deleteBtn);
        card.querySelector('.info').appendChild(actionDiv);
        
        container.appendChild(card);
    });
}

async function deleteSong(id) {
    if (confirm("Remove this song from your library?")) {
        try {
            await fetch(`/api/music/${id}`, { method: 'DELETE' });
            if (currentPlayBtn && currentPlayBtn.closest('.music-card').innerHTML.includes(id)) stopGlobalAudio();
            await fetchLibrary(); 
            showToast('Song removed from library');
        } catch (error) { showToast('Failed to delete', 'error'); }
    }
}

// --- SEARCH & INTELLISENSE LOGIC ---
let searchTimeout = null;
const searchInput = document.getElementById('search-term');
const searchForm = document.getElementById('search-form');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim(); 
        clearTimeout(searchTimeout);
        
        const featuredSection = document.getElementById('featured-section');
        
        if (!term) {
            document.getElementById('search-results').innerHTML = '';
            if (featuredSection) featuredSection.style.display = 'block'; 
            lastSearchResults = [];
            
            // --- FIX: Stop music when the search bar is cleared ---
            stopGlobalAudio(); 
            
            return;
        }

        if (featuredSection) featuredSection.style.display = 'none'; 

        searchTimeout = setTimeout(() => {
            performSearch(term);
        }, 500); 
    });
    
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearTimeout(searchTimeout);
        
        const term = searchInput.value.trim();
        const featuredSection = document.getElementById('featured-section');
        
        if (!term) {
            // --- FIX: Stop music if they hit enter on an empty bar ---
            stopGlobalAudio();
            document.getElementById('search-results').innerHTML = '';
            if (featuredSection) featuredSection.style.display = 'block';
            return;
        }
        
        if (featuredSection) featuredSection.style.display = 'none';
        performSearch(term);
    });
}

async function performSearch(term) {
    stopGlobalAudio(); 
    const container = document.getElementById('search-results');
    container.innerHTML = '<div class="loader-container"><div class="loader"></div><p style="color: #B3B3B3;">Searching...</p></div>';
    
    try {
        const response = await fetch(`/api/search?term=${encodeURIComponent(term)}`);
        lastSearchResults = await response.json();
        
        if (lastSearchResults.length === 0) {
            container.innerHTML = '<p>No songs found.</p>';
            return;
        }
        renderSearchResults(lastSearchResults, 'search-results');
    } catch (error) { container.innerHTML = '<p>Error loading results.</p>'; }
}

async function loadFeatured() {
    const row1 = document.getElementById('carousel-row-1');
    const row2 = document.getElementById('carousel-row-2');
    if (!row1 || !row2) return;
    
    try {
        // Fetch two different popular search terms independently
        const res1 = await fetch('/api/search?term=billboard+top+hits');
        const res2 = await fetch('/api/search?term=global+pop+hits');
        
        const arr1 = await res1.json();
        const arr2 = await res2.json();
        
        // Render them into their respective rows
        renderSearchResults(arr1, 'carousel-row-1');
        renderSearchResults(arr2, 'carousel-row-2');
        
        startAutoScroll();
    } catch (e) { console.error('Featured load failed'); }
}

// --- AUTO-SCROLL LOGIC (Independent Rows) ---
let intervalRow1, intervalRow2;

function scrollContainer(carousel) {
    if (!carousel || carousel.children.length === 0) return;
    const cardWidth = carousel.children[0].offsetWidth + 16; 
    
    // If we reach the end, smoothly scroll back to the start
    if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 10) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
        carousel.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
}

function renderSearchResults(results, targetContainerId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;
    container.innerHTML = ''; 

    results.forEach((track, index) => {
        const highResImage = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg') : PLACEHOLDER_ART;
        const songData = {
            song: track.trackName,
            artist: track.artistName,
            genre: track.primaryGenreName,
            albumArt: highResImage,
            previewUrl: track.previewUrl
        };
        
        const card = createCardHTML(songData, index);
        const existingRecord = libraryData.find(s => `${normalize(s.song)}|${normalize(s.artist)}` === `${normalize(track.trackName)}|${normalize(track.artistName)}`);
        
        const toggleBtn = document.createElement('button');
        
        // Helper to turn the button into a "Remove" state
        const setRemoveState = (recordId) => {
            toggleBtn.innerText = "Remove";
            toggleBtn.className = "btn-secondary"; // Ghost style
            toggleBtn.disabled = false;
            toggleBtn.onclick = async () => {
                toggleBtn.disabled = true;
                await fetch(`/api/music/${recordId}`, { method: 'DELETE' });
                await fetchLibrary(); // Keep background data synced
                showToast('Removed from library');
                setAddState(); // Revert back to Add
            };
        };

        // Helper to turn the button into an "Add" state
        const setAddState = () => {
            toggleBtn.innerText = "Add to Library";
            toggleBtn.className = ""; // Reverts to default green style
            toggleBtn.disabled = false;
            toggleBtn.onclick = async () => {
                toggleBtn.disabled = true;
                const res = await fetch('/api/music', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(songData) 
                });
                const savedSong = await res.json(); // Get the new database ID
                await fetchLibrary(); 
                showToast('Added to your library');
                setRemoveState(savedSong.id); // Swap to Remove
            };
        };

        // Set the initial button state based on if it's already in the library
        if (existingRecord) {
            setRemoveState(existingRecord.id);
        } else {
            setAddState();
        }

        card.appendChild(toggleBtn);
        container.appendChild(card);
    });
}

function createCardHTML(data, index) {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
        <div class="img-container">
            <img src="${data.albumArt || PLACEHOLDER_ART}" alt="Album Art" onerror="handleImgError(this)">
            <button class="play-btn">▶</button>
        </div>
        <div class="info">
            <h3>${data.song}</h3>
            <p>Artist: ${data.artist}</p>
            <p>Genre: ${data.genre}</p>
        </div>
    `;
    
    const playBtn = card.querySelector('.play-btn');
    playBtn.onclick = () => toggleAudio(data.previewUrl, playBtn, card);
    return card;
}

// --- ADD CUSTOM SONG ---
const addForm = document.getElementById('add-song-form');
if (addForm) {
    addForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        
        const songTitle = document.getElementById('song').value.trim();
        const artistName = document.getElementById('artist').value.trim();
        const genreName = document.getElementById('genre').value.trim();
        const artUrl = document.getElementById('albumArt').value.trim() || PLACEHOLDER_ART;
        
        if (!songTitle || !artistName || !genreName) return showToast('Please fill out all required fields', 'error');
        if (isDuplicate(songTitle, artistName)) return showToast('This song is already in your library', 'error');

        const newSong = { song: songTitle, artist: artistName, genre: genreName, albumArt: artUrl, previewUrl: '' };

        try {
            await fetch('/api/music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSong) });
            addForm.reset(); 
            fetchLibrary(); 
            showToast('Custom track added');
            switchTab('playlist-section'); 
        } catch(e) { showToast('Failed to add song', 'error'); }
    });
}

// --- EDIT PAGE ---
const editForm = document.getElementById('edit-song-form');
if (editForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('id');

    async function loadSongData() {
        const response = await fetch(`/api/music/${songId}`);
        const song = await response.json();
        
        document.getElementById('edit-song').value = song.song;
        document.getElementById('edit-artist').value = song.artist;
        document.getElementById('edit-genre').value = song.genre;
        document.getElementById('edit-albumArt').value = song.albumArt;
        document.getElementById('edit-previewUrl').value = song.previewUrl || ''; 
        
        const preview = document.getElementById('edit-art-preview');
        preview.onerror = () => handleImgError(preview);
        preview.src = song.albumArt || PLACEHOLDER_ART;
    }
    loadSongData();

    editForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const songTitle = document.getElementById('edit-song').value.trim();
        if (!songTitle) return showToast('Song title cannot be empty', 'error');

        if (confirm("Save these changes?")) {
            const updatedSong = {
                song: songTitle,
                artist: document.getElementById('edit-artist').value.trim(),
                genre: document.getElementById('edit-genre').value.trim(),
                albumArt: document.getElementById('edit-albumArt').value.trim(),
                previewUrl: document.getElementById('edit-previewUrl').value
            };

            await fetch(`/api/music/${songId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedSong) });
            window.location.href = 'index.html';
        }
    });
}

// --- AUTO-SCROLL LOGIC ---
let carouselInterval;
function startAutoScroll() {
    const row1 = document.getElementById('carousel-row-1');
    const row2 = document.getElementById('carousel-row-2');
    
    clearInterval(intervalRow1);
    clearInterval(intervalRow2);
    
    if (row1) {
        // Top row scrolls every 2 seconds (2000ms)
        intervalRow1 = setInterval(() => scrollContainer(row1), 2000);
        
        // Pause on hover
        row1.addEventListener('mouseenter', () => clearInterval(intervalRow1));
        row1.addEventListener('mouseleave', () => {
            clearInterval(intervalRow1);
            intervalRow1 = setInterval(() => scrollContainer(row1), 2000);
        });
    }
    
    if (row2) {
        // Bottom row scrolls every 4 seconds (4000ms)
        intervalRow2 = setInterval(() => scrollContainer(row2), 4000);
        
        // Pause on hover
        row2.addEventListener('mouseenter', () => clearInterval(intervalRow2));
        row2.addEventListener('mouseleave', () => {
            clearInterval(intervalRow2);
            intervalRow2 = setInterval(() => scrollContainer(row2), 4000);
        });
    }
}


// Initial Bootup
if (document.getElementById('playlist-container')) {
    fetchLibrary();
    loadFeatured();
}