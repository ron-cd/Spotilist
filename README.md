# SpotiList

SpotiList is a lightweight music library app built with Node.js and Express. It lets users search for songs through the iTunes API, add tracks to a personal playlist, and edit or delete entries from their library.

## Features

- Search for songs and artists using the iTunes API
- Add custom songs manually
- View a personal music library
- Edit existing song metadata
- Delete songs from the playlist
- Store playlist data in a local JSON file
- Responsive single-page interface served from the public folder

## Tech Stack

- Node.js
- Express
- Vanilla JavaScript
- HTML/CSS
- Local JSON storage via `music.json`

## Project Structure

```text
Spotilist/
├── db.js              # Read/write functions for the JSON data store
├── music.json         # Persists the saved playlist entries
├── package.json       # Project metadata and dependencies
├── server.js          # Express API and app startup
├── public/
│   ├── index.html     # Main UI for discovering and browsing music
│   ├── edit.html      # Edit form for updating song details
│   ├── script.js      # Frontend logic and API calls
│   ├── style.css      # Styling for the app
└── README.md          # Project overview and setup instructions
```

## Prerequisites

- Node.js installed on your machine
- npm package manager

## Installation

1. Open a terminal in the project root.
2. Install dependencies:

```bash
npm install
```

## Running the App

Start the server:

```bash
node server.js
```

Then open your browser to:

```text
http://localhost:3000
```

The app serves the front-end from the `public` directory and exposes REST endpoints from the backend.

## API Endpoints

The server includes the following endpoints:

- `GET /api/music` - Get all songs in the playlist
- `POST /api/music` - Add a new song
- `GET /api/music/:id` - Get one song by ID
- `PUT /api/music/:id` - Update a song
- `DELETE /api/music/:id` - Remove a song
- `GET /api/search?term=<search-term>` - Search iTunes for songs

## Data Storage

Playlist data is stored in `music.json` using a simple JSON array structure. Each song item includes fields such as:

- `id`
- `song`
- `artist`
- `genre`
- `albumArt`

## Notes

- The app uses the iTunes Search API for discovery, so internet access is required for search features.
- The app is intentionally simple and stores data locally instead of using a database.
- The server serves static files from `public`, so the UI and API work together as a single app.

## License

This project is currently unlicensed unless otherwise specified in the repository.
