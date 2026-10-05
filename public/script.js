// --- VIEW SWITCHING LOGIC ---
const navLinks = document.querySelectorAll('.sidebar nav a');
const sections = document.querySelectorAll('.view-section');

if (navLinks.length > 0) {
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            sections.forEach(sec => sec.classList.remove('active-view'));
            const targetId = this.getAttribute('href').substring(1); 
            document.getElementById(targetId).classList.add('active-view');
        });
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `<span style="color: #1DB954; font-size: 18px;">✓</span> ${message}` : `<span style="color: #e22134; font-size: 18px;">✕</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

// --- GLOBAL AUDIO PLAYER ---
const audio = new Audio();
let currentPlayBtn = null;

function toggleAudio(url, btnElement, cardElement) {
    if (!url) {
        showToast('No audio preview available for this track', 'error');
        return;
    }

    if (audio.src === url && !audio.paused) {
        audio.pause();
        btnElement.innerHTML = '▶';
        cardElement.classList.remove('playing');
        return;
    }

    if (currentPlayBtn) {
        currentPlayBtn.innerHTML = '▶';
        currentPlayBtn.closest('.music-card').classList.remove('playing');
    }

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

async function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if (!container) return; 

    try {
        const response = await fetch('/api/music');
        const playlist = await response.json();
        container.innerHTML = ''; 

        playlist.forEach((record, index) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.style.animationDelay = `${index * 0.1}s`; 
            
            card.innerHTML = `
                <div class="img-container">
                    <img src="${record.albumArt}" alt="Album Art">
                    <button class="play-btn">▶</button>
                </div>
                <div class="info">
                    <h3>${record.song}</h3>
                    <p>Artist: ${record.artist}</p>
                    <p>Genre: ${record.genre}</p>
                    <div style="margin-top: 10px;">
                        <a href="edit.html?id=${record.id}">Edit</a>
                        <button class="btn-secondary delete-btn" style="padding: 6px 12px; border-color: #727272; background: transparent; color: white;">Delete</button>
                    </div>
                </div>
            `;
            
            // Attach event listeners safely
            const playBtn = card.querySelector('.play-btn');
            playBtn.onclick = () => toggleAudio(record.previewUrl, playBtn, card);
            
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.onclick = () => deleteSong(record.id);

            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading playlist:', error);
    }
}

async function deleteSong(id) {
    if (confirm("Are you sure you want to remove this song from your library?")) {
        try {
            await fetch(`/api/music/${id}`, { method: 'DELETE' });
            
            // Stop audio if the user deletes the song currently playing
            if (currentPlayBtn && currentPlayBtn.closest('.music-card').querySelector('.delete-btn').onclick.toString().includes(id)) {
                audio.pause();
            }
            
            loadPlaylist(); 
            showToast('Song removed from your library');
        } catch (error) {
            console.error('Error deleting song:', error);
            showToast('Failed to delete song', 'error');
        }
    }
}

loadPlaylist();

const addForm = document.getElementById('add-song-form');
if (addForm) {
    addForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        const newSong = {
            song: document.getElementById('song').value,
            artist: document.getElementById('artist').value,
            genre: document.getElementById('genre').value,
            albumArt: document.getElementById('albumArt').value || 'https://placehold.co/600x600/181818/ffffff?text=No+Art',
            previewUrl: '' // Manual entries won't have audio clips by default
        };

        try {
            await fetch('/api/music', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSong)
            });
            addForm.reset(); 
            loadPlaylist(); 
            showToast('Added to your library');
        } catch(e) {
            showToast('Failed to add song', 'error');
        }
    });
}

const searchForm = document.getElementById('search-form');
if (searchForm) {
    searchForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        
        const term = document.getElementById('search-term').value;
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div class="loader-container"><div class="loader"></div><p style="color: #B3B3B3;">Searching iTunes...</p></div>';
        
        try {
            const response = await fetch(`/api/search?term=${term}`);
            const results = await response.json();
            resultsContainer.innerHTML = ''; 
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p>No songs found.</p>';
                return;
            }

            results.forEach((track, index) => {
                const card = document.createElement('div');
                card.className = 'music-card';
                card.style.animationDelay = `${index * 0.1}s`;
                
                const highResImage = track.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
                const songData = {
                    song: track.trackName,
                    artist: track.artistName,
                    genre: track.primaryGenreName,
                    albumArt: highResImage,
                    previewUrl: track.previewUrl // Capture the audio link
                };
                
                card.innerHTML = `
                    <div class="img-container">
                        <img src="${highResImage}" alt="Album Art">
                        <button class="play-btn">▶</button>
                    </div>
                    <div class="info">
                        <h3>${track.trackName}</h3>
                        <p>Artist: ${track.artistName}</p>
                        <p>Genre: ${track.primaryGenreName}</p>
                    </div>
                `;
                
                const playBtn = card.querySelector('.play-btn');
                playBtn.onclick = () => toggleAudio(track.previewUrl, playBtn, card);

                const addButton = document.createElement('button');
                addButton.innerText = "Add to Library";
                addButton.onclick = async function() {
                    try {
                        await fetch('/api/music', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(songData)
                        });
                        loadPlaylist(); 
                        showToast('Added to your library');
                        addButton.innerText = "Added ✓";
                        addButton.disabled = true;
                    } catch (error) {
                        showToast('Failed to add song', 'error');
                    }
                };

                card.appendChild(addButton);
                resultsContainer.appendChild(card);
            });
        } catch (error) {
            resultsContainer.innerHTML = '<p>Error loading results.</p>';
        }
    });
}

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
        document.getElementById('edit-previewUrl').value = song.previewUrl || ''; // Load hidden URL
        document.getElementById('edit-art-preview').src = song.albumArt;
    }

    loadSongData();

    editForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (confirm("Are you sure you want to save these changes?")) {
            const updatedSong = {
                song: document.getElementById('edit-song').value,
                artist: document.getElementById('edit-artist').value,
                genre: document.getElementById('edit-genre').value,
                albumArt: document.getElementById('edit-albumArt').value,
                previewUrl: document.getElementById('edit-previewUrl').value // Save hidden URL
            };

            await fetch(`/api/music/${songId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSong)
            });

            window.location.href = 'index.html';
        }
    });
}