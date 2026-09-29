const fs = require('fs');

const dbFile = 'music.json';

// Function to read all songs from the JSON file
function getMusic() {
    try {
        const data = fs.readFileSync(dbFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist or has an error, return an empty array
        return [];
    }
}

// Function to save the updated playlist back to the JSON file
function saveMusic(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
}

// Export the functions so server.js can use them
module.exports = { getMusic, saveMusic };