const express = require('express');
const db = require('./db'); 
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/api/music', (req, res) => {
    db.all("SELECT * FROM playlist", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.json(rows);
    });
});

app.post('/api/music', (req, res) => {
    const { song, artist, genre, albumArt, previewUrl } = req.body;
    const query = "INSERT INTO playlist (song, artist, genre, albumArt, previewUrl) VALUES (?, ?, ?, ?, ?)";
    
    db.run(query, [song, artist, genre, albumArt, previewUrl], function(err) {
        if (err) return res.status(500).send(err.message);
        res.status(201).json({ id: this.lastID, song, artist, genre, albumArt, previewUrl });
    });
});

app.get('/api/music/:id', (req, res) => {
    const query = "SELECT * FROM playlist WHERE id = ?";
    db.get(query, [req.params.id], (err, row) => {
        if (err) return res.status(500).send(err.message);
        if (row) res.json(row);
        else res.status(404).send('Song not found');
    });
});

app.put('/api/music/:id', (req, res) => {
    const { song, artist, genre, albumArt, previewUrl } = req.body;
    const query = "UPDATE playlist SET song = ?, artist = ?, genre = ?, albumArt = ?, previewUrl = ? WHERE id = ?";
    
    db.run(query, [song, artist, genre, albumArt, previewUrl, req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        if (this.changes > 0) res.json({ id: req.params.id, song, artist, genre, albumArt, previewUrl });
        else res.status(404).send('Song not found');
    });
});

app.delete('/api/music/:id', (req, res) => {
    const query = "DELETE FROM playlist WHERE id = ?";
    db.run(query, [req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        if (this.changes > 0) res.status(200).send('Song deleted');
        else res.status(404).send('Song not found');
    });
});

app.get('/api/search', async (req, res) => {
    try {
        const term = req.query.term;
        const itunesUrl = `https://itunes.apple.com/search?term=${term}&entity=song&limit=10`;
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