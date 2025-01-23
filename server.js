const express = require('express');
const cors = require('cors'); // CORS hinzufügen
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

// CORS konfigurieren
const corsOptions = {
    origin: '*', // Erlaubt Anfragen von allen Quellen
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

        const videoTitle = stdout.trim().replace(/[^a-zA-Z0-9 \-]/g, ''); // Bereinigung des Titels
        const filename = `${videoTitle}.mp3`;
        const filepath = path.join(downloadFolder, filename);

        const downloadCommand = `yt-dlp -x --audio-format mp3 --ffmpeg-location "/opt/render/project/src/bin/ffmpeg" -o "${filepath}" "${url}"`;

        exec(downloadCommand, (downloadError) => {
            if (downloadError) {
                console.error(`Fehler: ${downloadError.message}`);
                return res.status(500).json({ error: 'Fehler beim Herunterladen.' });
            }

            // Datei direkt als Download senden
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
        });
    });
});
