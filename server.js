const express = require('express');
const cors = require('cors'); // CORS hinzufügen
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});


// CORS konfigurieren
const corsOptions = {
    origin: 'http://127.0.0.1:5500', // Erlaubt nur Anfragen von dieser Quelle
    methods: ['GET', 'POST', 'OPTIONS'], // Erlaubt GET, POST und OPTIONS
    allowedHeaders: ['Content-Type'], // Erlaubt Content-Type-Header
};
app.use(cors(corsOptions)); // CORS aktivieren

// OPTIONS-Anfragen explizit behandeln
app.options('*', cors(corsOptions));

app.use(express.json());

// API-Endpunkt für das Herunterladen und Konvertieren von YouTube-Videos
app.post('/api/download', (req, res) => {
    const url = req.body.url;

    if (!url || !url.startsWith('https://www.youtube.com')) {
        return res.status(400).json({ error: 'Ungültiger YouTube-Link.' });
    }

    const downloadFolder = path.join(__dirname, 'Downloaded Music');
    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder);
    }

    const command = `yt-dlp --get-title "${url}"`;

    exec(command, (error, stdout) => {
        if (error) {
            console.error(`Fehler beim Abrufen des Titels: ${error.message}`);
            return res.status(500).json({ error: 'Fehler beim Abrufen des Video-Titels.' });
        }

        const videoTitle = stdout.trim().replace(/[^a-zA-Z0-9 \\-]/g, '');
        const filename = `${videoTitle}.mp3`;
        const filepath = path.join(downloadFolder, filename);

        const downloadCommand = `yt-dlp -x --audio-format mp3 --ffmpeg-location "C:\\ffmpeg\\bin\\ffmpeg.exe" -o "${filepath}" "${url}"`;

        exec(downloadCommand, (downloadError) => {
            if (downloadError) {
                console.error(`Fehler: ${downloadError.message}`);
                return res.status(500).json({ error: 'Fehler beim Herunterladen.' });
            }

            res.json({ downloadUrl: `http://localhost:${PORT}/download/${filename}` });
        });
    });
});

// Endpunkt, um die heruntergeladene Datei bereitzustellen
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'Downloaded Music', filename);

    if (fs.existsSync(filepath)) {
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error(`Fehler beim Senden der Datei: ${err.message}`);
            }
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Fehler beim Löschen der Datei: ${unlinkErr.message}`);
                }
            });
        });
    } else {
        res.status(404).json({ error: 'Datei nicht gefunden.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
