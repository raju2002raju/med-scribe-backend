const express = require('express');
const router = express.Router();
const { ClientData } = require('../models'); 
const { MongoClient } = require('mongodb');


const uri = "mongodb://localhost:27017/medspa";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



client.connect().then(() => {
    const database = client.db("medspa");
    appointmentsCollection = database.collection("appointments");
    console.log("Connected to MongoDB");
}).catch(error => {
    console.error("MongoDB connection error:", error);
});

router.post('/sendData', async (req, res) => {
    const data = req.body;
    try {
        const result = await appointmentsCollection.insertOne(data);
        console.log(`New appointment created with the following id: ${result.insertedId}`);
        res.status(200).json({ message: 'Data received and stored successfully', id: result.insertedId });
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        res.status(500).json({ message: 'Error storing data', error: error.message });
    }
});


router.post('/clientData', async (req, res) => {
    const { opportunities, visitedClients } = req.body;
    try {
        const clientData = new ClientData({
            opportunities,
            visitedClients
        });
        await clientData.save();
        res.status(200).json({ message: 'Data received and stored successfully' });
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        res.status(500).json({ message: 'Error storing data', error: error.message });
    }
});



module.exports = router;
