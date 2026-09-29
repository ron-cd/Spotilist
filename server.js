const express = require('express');
const { getMusic, saveMusic } = require('./db');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// READ: Get all songs
app.get('/api/music', (req, res) => {
    const playlist = getMusic();
    res.json(playlist);
});

// CREATE: Add a new song
app.post('/api/music', (req, res) => {
    const playlist = getMusic();
    const newSong = req.body;

    const maxId = playlist.length > 0 ? Math.max(...playlist.map(song => song.id)) : 0;
    newSong.id = maxId + 1;

    playlist.push(newSong);
    saveMusic(playlist);
    
    res.status(201).json(newSong);
});

// READ ONE: Get a single song for edit page
app.get('/api/music/:id', (req, res) => {
    const playlist = getMusic();
    const songId = parseInt(req.params.id);
    const song = playlist.find(s => s.id === songId);
    
    if (song) res.json(song);
    else res.status(404).send('Song not found');
});

// UPDATE: Save changes
app.put('/api/music/:id', (req, res) => {
    const playlist = getMusic();
    const songId = parseInt(req.params.id);
    const index = playlist.findIndex(s => s.id === songId);

    if (index !== -1) {
        playlist[index] = { ...req.body, id: songId };
        saveMusic(playlist);
        res.json(playlist[index]);
    } else {
        res.status(404).send('Song not found');
    }
});

// DELETE: Remove a song
app.delete('/api/music/:id', (req, res) => {
    let playlist = getMusic();
    const songId = parseInt(req.params.id);
    const initialLength = playlist.length;

    playlist = playlist.filter(s => s.id !== songId);

    if (playlist.length < initialLength) {
        saveMusic(playlist);
        res.status(200).send('Song deleted');
    } else {
        res.status(404).send('Song not found');
    }
});

// iTUNES API: Search for songs online
app.get('/api/search', async (req, res) => {
    try {
        const term = req.query.term;
        const itunesUrl = `https://itunes.apple.com/search?term=${term}&entity=song&limit=15`;
        const response = await fetch(itunesUrl);
        const data = await response.json();
        res.json(data.results);
    } catch (error) {
        console.error('Error fetching from iTunes:', error);
        res.status(500).send('Error connecting to iTunes');
    }
});

app.listen(PORT, () => {
    console.log(`SpotiList server is running at http://localhost:${PORT}`);
});