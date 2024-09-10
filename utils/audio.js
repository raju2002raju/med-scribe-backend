const axios = require('axios');
const OpenAI = require('openai');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { getAppointmentsCollection, getClientDataCollection, connectToDatabase} = require('../utils/database');
const { getLanguages } = require('../utils/languageUtils');

async function transcribeAudio(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                }
            }
        );
        return response.data.text;
    } catch (error) {
        console.error('Error during transcription:', error.message);
        throw new Error('Transcription failed');
    }
}

async function getChatCompletion(transcript) {
    try {
        await connectToDatabase(); 
        const appointmentsCollection = getAppointmentsCollection();
        const clientDataCollection = getClientDataCollection();

        const appointments = await appointmentsCollection.find().toArray();
        const appointmentsText = JSON.stringify(appointments).substring(0, 1000);

        const clientData = await clientDataCollection.find().toArray();
        const clientDataText = JSON.stringify(clientData).substring(0, 5000);

        let prompt = `${process.env.PROMPT} ${transcript}.`;
        prompt += ` Check this data and if there is anything related to appointment query then respond to users based on this data: "${appointmentsText}". Goal: Make sure your replies will be short within 50 words. It should be precise what user is asking. If user is asking for client data that we have in here: "${clientDataText}". Then please read this data and respond to user politely based on this data. Goal: Make sure your replies should be only related to what user asked about client details. It should be precise whatever user is asking. Reply should no more than 100 words. User can ask about details of the opportunities like their phone number or their last appointment date or anything about their notes. You have to look for the details in the data provided and respond them for whatever user is asked only. `;

        console.log(`Prompt: ${prompt}`);

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                }
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content;
        } else {
            throw new Error('Unexpected response structure from OpenAI API');
        }
    } catch (error) {
        console.error('Error during chat completion:', error.message);
        if (error.response) {
            console.error('OpenAI API response data:', error.response.data);
        }
        throw new Error('Chat completion failed');
    }
}

async function convertToMP3(text) {
    const outputFilePath = path.join(__dirname, '..', 'uploads', `speech-${Date.now()}.mp3`);
    try {
        const response = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.promises.writeFile(outputFilePath, buffer);
        const publicURL = `https://med-scribe-backend.onrender.com//files/${path.basename(outputFilePath)}`;
        return publicURL;
    } catch (error) {
        console.error('Error during MP3 conversion:', error.message);
        throw new Error('MP3 conversion failed');
    }
}

async function rewriteTranscript(transcribedText) {
    try {
        const { inputLanguage, outputLanguage } = getLanguages();
        
        const prompt = `Only correct the grammar mistakes of this text and translate from ${inputLanguage} to ${outputLanguage}:\n\n${transcribedText}`;
        console.log(`Language ${inputLanguage}, ${outputLanguage}`);
        
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            throw new Error('Unexpected response structure from OpenAI API');
        }
    } catch (error) {
        console.error('Error during text rewriting:', error.message);
        if (error.response) {
            console.error('OpenAI API response data:', error.response.data);
        }
        throw new Error('Text rewriting failed');
    }
}


module.exports = {
    transcribeAudio,
    getChatCompletion,
    convertToMP3,
    rewriteTranscript
};
