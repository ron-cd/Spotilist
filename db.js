const sqlite3 = require('sqlite3').verbose();

// Connect to (or create) the SQLite database file
const db = new sqlite3.Database('./music.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create the schema if it doesn't already exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS playlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song TEXT NOT NULL,
            artist TEXT NOT NULL,
            genre TEXT NOT NULL,
            albumArt TEXT,
            previewUrl TEXT
        )
    `);
});

// Export the database connection so server.js can use it
module.exports = db;