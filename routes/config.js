const express = require('express');
const router = express.Router();
const fs = require('fs');
const { getUsersCollection } = require('../utils/database'); 

let customPrompt = ''; 

const updateEnvFile = () => {
    const envContent = `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}\nPROMPT=${customPrompt || ''}\n`;
    fs.writeFileSync('.env', envContent);
};

router.post('/api/update-open-ai-api-key', async (req, res) => {
    const { openAiApiKey, ghlApiKey, email } = req.body;
    console.log('Received request:', { openAiApiKey: '***', ghlApiKey: '***', email });

    if (!openAiApiKey || !email) {
        console.log('Missing required fields');
        return res.status(400).json({ error: 'OpenAI API key and email are required' });
    }

    try {
        process.env.OPENAI_API_KEY = openAiApiKey;
        updateEnvFile();
        console.log('Environment file updated');

        const usersCollection = getUsersCollection();
        const result = await usersCollection.updateOne(
            { email: email },
            {
                $set: {
                    ghlApiKey: ghlApiKey,
                    openAiApiKey: openAiApiKey
                }
            },
            { upsert: true }
        );

        if (result.matchedCount > 0 || result.upsertedCount > 0) {
            console.log('Update successful');
            res.json({ message: 'OpenAI API key updated and GHL API key stored successfully!' });
        } else {
            console.log('Update failed: No document matched or inserted');
            res.status(404).json({ error: 'User not found and new document could not be created' });
        }
    } catch (err) {
        console.error('Error updating API keys:', err);
        res.status(500).json({ error: 'Failed to update API keys', details: err.message });
    }
});


// Route to fetch the OpenAI API key and update .env
router.get('/api/update-open-ai-api-key', async (req, res) => {
    const { email } = req.query;
    console.log(email);

    if (!email) {
        return res.status(400).json({ error: 'Email parameter is required' });
    }

    try {
        // Get the users collection
        const usersCollection = getUsersCollection();

        // Fetch the user document
        const user = await usersCollection.findOne({ email: email });
        

        if (!user || !user.openAiApiKey) {
            return res.status(404).json({ error: 'User not found or OpenAI API key not available' });
        }

        // Update the .env file with the OpenAI API key
        const { openAiApiKey } = user;
        console.log(openAiApiKey);
        process.env.OPENAI_API_KEY = openAiApiKey; 
        updateEnvFile('OPENAI_API_KEY', openAiApiKey);

        res.json({ message: 'OpenAI API key updated in .env file' });
    } catch (err) {
        console.error('Error fetching and updating OpenAI API key:', err);
        res.status(500).json({ error: 'Failed to update OpenAI API key', details: err.message });
    }
});

router.get('/get-ghl-api-key', async (req, res) => {
    const { email } = req.query;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne({ email });

        if (user && user.ghlApiKey) {
            res.json({ ghlApiKey: user.ghlApiKey });
        } else {
            res.status(404).json({ error: 'User not found or GHL API key not set' });
        }
    } catch (err) {
        console.error('Error fetching GHL API key:', err);
        res.status(500).json({ error: 'Failed to fetch GHL API key', details: err.message });
    }
});


router.post('/api/update-prompt', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

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
