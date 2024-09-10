const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const { getUsersCollection, connectToDatabase, getAppointmentsCollection } = require('../utils/database');
const cloudinary = require('../routes/cloudinaryConfig');
const User = require('../models/user');
const router = express.Router();

// Set up express-session middleware
router.use(
    session({
        secret: 'your_secret_key', 
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } 
    })
);

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });



router.post('/signup', upload.single('profileImage'), async (req, res) => {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
    }

    try {
        const usersCollection = getUsersCollection();
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
            return res.status(200).json({ status: 'exist' });
        }

        let uploadedImageUrl = null;
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: 'user_profiles' }, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
                stream.end(req.file.buffer);
            });

            uploadedImageUrl = uploadResult.secure_url;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            name,
            email,
            phone,
            password: hashedPassword,
            profileImage: uploadedImageUrl
        };

        const result = await usersCollection.insertOne(newUser);
        const insertedUser = await usersCollection.findOne({ _id: result.insertedId });

        const { password: _, ...userWithoutPassword } = insertedUser;
        req.session.userEmail = email;
        console.log('signup userEmail', req.session.userEmail) // Store email in session
        return res.status(200).json({ status: 'success', data: userWithoutPassword });

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred during signup' });
    }
});


router.post('/signup-with-google', async (req, res) => {
    const { name, email, profileImage } = req.body;
  
    try {
      const usersCollection = getUsersCollection();
      const existingUser = await usersCollection.findOne({ email });
  
      if (existingUser) {
        return res.status(200).json({ success: false, message: 'User already exists' });
      }
  
      const newUser = {
        name,
        email,
        profileImage,
      };
  
      const result = await usersCollection.insertOne(newUser);
      const insertedUser = await usersCollection.findOne({ _id: result.insertedId });
  
      const { password: _, ...userWithoutPassword } = insertedUser;
      req.session.userEmail = email;
      console.log('signup userEmail', req.session.userEmail); // Store email in session
      return res.status(200).json({ success: true, data: userWithoutPassword });
  
    } catch (error) {
      console.error('Error during signup with Google:', error);
      res.status(500).json({ success: false, message: 'An error occurred during signup' });
    }
  });

// Utility function to update the .env file
const updateEnvFile = (key, value) => {
    const envFilePath = path.resolve(__dirname, '../.env');
    const envFileContent = fs.readFileSync(envFilePath, 'utf8');
    const updatedEnvFileContent = envFileContent
        .split('\n')
        .map(line => {
            if (line.startsWith(`${key}=`)) {
                return `${key}=${value}`; 
            }
            return line;
        })
        .join('\n');

    fs.writeFileSync(envFilePath, updatedEnvFileContent, 'utf8');
};

// Utility function to clear a key from the .env file
const clearEnvKeyValue = (key) => {
    try {
        const envFilePath = path.resolve(__dirname, '../.env');
        let envFileContent = fs.readFileSync(envFilePath, 'utf8');
        
        // Check if the key exists
        if (!envFileContent.includes(`${key}=`)) {
            console.log(`${key} does not exist in the .env file.`);
            return;
        }

        const updatedEnvFileContent = envFileContent
            .split('\n')
            .map(line => {
                if (line.startsWith(`${key}=`)) {
                    return `${key}=`; // Clear the value
                }
                return line;
            })
            .join('\n');

        fs.writeFileSync(envFilePath, updatedEnvFileContent, 'utf8');
        console.log(`Cleared ${key} from .env file.`);
    } catch (err) {
        console.error('Error while clearing environment variable:', err);
        throw err;
    }
};


// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }

    try {
        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ status: 'notexist', message: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ status: 'invalid_credentials', message: 'Invalid credentials' });
        }

        // If the user has an OpenAI API key, update the .env file
        if (user.openAiApiKey) {
            process.env.OPENAI_API_KEY = user.openAiApiKey;
            updateEnvFile('OPENAI_API_KEY', user.openAiApiKey);
        }

        // Return success response
        res.status(200).json({ status: 'exist', user });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ status: 'error', message: 'Error during login', error: error.message });
    }
});

// Get User Route
router.get('/user', async (req, res) => {
    try {
        const email = req.query.email || req.headers['user-email'];

        if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        }

        const clientDataCollection = getUsersCollection();
        const clientData = await clientDataCollection.find({ email }).toArray();

        if (clientData.length === 0) {
            return res.status(404).json({ message: 'No data found for this email' });
        }

        res.json(clientData);
    } catch (error) {
        console.error('Error fetching client data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ status: 'error', message: 'Failed to log out' });
            }
            
            // Clear the OpenAI API key from the .env file
            try {
                clearEnvKeyValue('OPENAI_API_KEY');

            } catch (fileError) {
                console.error('Failed to clear OpenAI API key from .env file:', fileError);
                return res.status(500).json({ status: 'error', message: 'Failed to clear OpenAI API key from .env file' });
            }
            
            res.status(200).json({ status: 'success', message: 'Logged out successfully' });
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});


// Chat Process Route
router.post('/chat-process', upload.none(), async (req, res) => {
    const userMessage = req.body.text;

    try {
        await connectToDatabase();
        const appointmentsCollection = getAppointmentsCollection();
        const appointments = await appointmentsCollection.find().toArray();
        const appointmentsText = JSON.stringify(appointments).substring(0, 1000);

        let prompt = `${process.env.PROMPT} ${userMessage}.`;
        prompt += ` Check this data and if there is anything related to appointment query then respond to users based on this data: "${appointmentsText}". User can ask about details of the opportunities like their phone number or their last appointment date or anything about their notes. You have to look for the details in the data provided and respond to whatever the user is asking only.`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                }
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const botResponse = response.data.choices[0].message.content;

            res.json({ message: botResponse });
        } else {
            throw new Error('Unexpected response structure from OpenAI API');
        }
    } catch (error) {
        console.error('Error during chat completion:', error.message);
        if (error.response) {
            console.error('OpenAI API response data:', error.response.data);
        }
        res.status(500).json({ status: 'error', message: 'Chat completion failed', error: error.message });
    }
});

module.exports = router;
