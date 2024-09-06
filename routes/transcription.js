const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { transcribeAudio, getChatCompletion, convertToMP3, rewriteTranscript } = require('../utils/audio'); 
const { Transcript } = require('../models');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

let transcriptions = [];

const upload = multer({ storage: storage });

router.post('/asr', upload.single('wavfile'), async (req, res) => {
    console.log('File received:', req.file);
    const { contactId, dateTime } = req.body;

    try {
        const transcript = await transcribeAudio(req.file.path);
        console.log('Transcription:', transcript);

        const chatResponse = await getChatCompletion(transcript);
        console.log('OpenAI Response:', chatResponse);

        const mp3Url = await convertToMP3(chatResponse);
        console.log('MP3 URL:', mp3Url);

        const recordingUrl = `https://med-scribe-backend.onrender.com/uploads/${req.file.filename}`;
        console.log('Recording URL:', recordingUrl);

        const transcription = { id: Date.now(), transcript, filePath: req.file.filename, contactId, dateTime, recordingUrl };
        transcriptions.push(transcription);

        res.send({ message: 'File received, transcribed, and responded successfully', transcript, chatResponse, mp3Url, recordingUrl });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send({ error: 'Error', details: error.response ? error.response.data : error.message });
    }
});


router.get('/save-transcript', async (req, res) => {
    try {
        const transcripts = await Transcript.find({});
        res.json({ contacts: transcripts });
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        res.status(500).send('Error fetching transcripts');
    }
});


router.post('/save-transcript', async (req, res) => {
    const { transcript, title, folder } = req.body;

    try {
        const newTranscript = new Transcript({ transcript, title, folder });
        await newTranscript.save();
        console.log("Transcript saved successfully:", transcript, 'Title', title, 'Folder', folder);
        res.status(200).send("Transcript saved successfully");
    } catch (error) {
        console.error("Error saving transcript:", error);
        res.status(500).send("Error saving transcript");
    }
});

router.post('/rewrite-transcript', async (req, res) => {
    const { transcript } = req.body;
    try {
        const rewrittenTranscript = await rewriteTranscript(transcript);
        res.json({ rewritten: rewrittenTranscript });
    } catch (error) {
        console.error('Error rewriting transcript:', error.message);
        res.status(500).json({ message: 'Error rewriting transcript', error: error.message });
    }
});

module.exports = router;
