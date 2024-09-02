const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { getUsersCollection, connectToDatabase, getAppointmentsCollection } = require('../utils/database');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append the date to ensure unique filenames
    }
});

const upload = multer({ storage: storage });

// Signup Route
router.post('/signup', upload.single('profileImage'), async (req, res) => {
    const { name, email, password, confirmPassword, phone } = req.body;
    
    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
    }

    try {
        const usersCollection = getUsersCollection();
        const existingUser = await usersCollection.findOne({ email });

        // Check if the user already exists
        if (existingUser) {
            return res.status(200).json({ status: 'exist' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { 
            name, 
            email, 
            phone, 
            password: hashedPassword,
            profileImage: req.file ? `/uploads/${req.file.filename}` : null
        };
        
        // Insert the new user
        const result = await usersCollection.insertOne(newUser);
        const insertedUser = await usersCollection.findOne({ _id: result.insertedId });

        // Send back the user data without the password
        const { password: _, ...userWithoutPassword } = insertedUser;
        return res.status(200).json({ status: 'success', user: userWithoutPassword });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ status: 'error', message: 'Error during signup', error: error.message });
    }
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ status: 'notexist' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ status: 'Password incorrect' }); 
        }

        res.status(200).json({ status: 'exist', user });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ status: 'error', message: 'Error during login', error: error.message });
    }
});

// const ensureAuthenticated = (req, res, next) => {
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     res.status(401).json({ message: 'Unauthorized' });
// };

// router.get('/user', ensureAuthenticated, async (req, res) => {
//     try {
//         await client.connect();
//         const database = client.db("medspa"); 
//         const usersCollection = database.collection("users");
       
//         const userEmail = req.user.email; 
//         console.log('User email:', userEmail);

//         const user = await usersCollection.findOne(
//             { email: userEmail },
//             { projection: { name: 1, email: 1, profileImage: 1, _id: 0 } }
//         );

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         res.status(200).json(user);
//     } catch (error) {
//         console.error('Error fetching user data:', error);
//         res.status(500).json({ message: 'Server error' });
//     } finally {
//         await client.close();
//     }
// });

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
