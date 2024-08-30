const express = require('express');
const router = express.Router();
const { setLanguages } = require('../utils/languageUtils'); 

router.post('/send-languages', (req, res) => {
    const { inputLanguage, outputLanguage } = req.body;
    
    if (!inputLanguage || !outputLanguage) {
        return res.status(400).json({ error: 'Input and Output languages are required' });
    }

    console.log(`Input Language: ${inputLanguage}`);
    console.log(`Output Language: ${outputLanguage}`);

    // Store or pass the languages
    setLanguages(inputLanguage, outputLanguage);

    res.status(200).json({ message: 'Languages received successfully' });
});

module.exports = router;