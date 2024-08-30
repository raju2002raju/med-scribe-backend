const express = require('express');
const router = express.Router();
const fs = require('fs');

const updateEnvFile = () => {
    const envContent = `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}\nPROMPT=${customPrompt}\n`;
    fs.writeFileSync('.env', envContent);
};

router.post('/api/update-open-ai-api-key', (req, res) => {
    const { openAiApiKey } = req.body;
    try {
        process.env.OPENAI_API_KEY = openAiApiKey;
        updateEnvFile();
        res.json({ message: 'Open AI API key updated successfully!' });
    } catch (err) {
        console.error('Error updating Open AI API key:', err);
        res.status(500).json({ error: 'Failed to update Open AI API key' });
    }
});

router.get('/api/get-open-ai-api-key', (req, res) => {
    res.json({ openAiApiKey: process.env.OPENAI_API_KEY });
});

router.post('/api/update-prompt', (req, res) => {
    const { prompt } = req.body;
    try {
        customPrompt = prompt;
        process.env.PROMPT = prompt;
        updateEnvFile();
        res.json({ message: 'Prompt updated successfully!' });
    } catch (err) {
        console.error('Error updating prompt:', err);
        res.status(500).json({ error: 'Failed to update prompt' });
    }
});

module.exports = router;
