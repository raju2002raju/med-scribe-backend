const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const router = require('../routes/forgotpassword');


const mongoURI = "mongodb+srv://royr55601:royr55601@cluster0.xra8inl.mongodb.net/medspa";


const mongoClient = new MongoClient(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));


let database, usersCollection, appointmentsCollection, clientDataCollection;

const connectToDatabase = async () => {
  try {
    await mongoClient.connect();
    console.log("Connected to MongoDB (Native Client)");

    database = mongoClient.db("medspa");
    usersCollection = database.collection("users");
    appointmentsCollection = database.collection("appointments");
    clientDataCollection = database.collection("clientdatas");
  } catch (error) {
    console.error("MongoDB connection error (Native Client):", error);
    throw new Error('Database connection failed');
  }
};

const getDatabase = () => {
  if (!database) {
    throw new Error('Database not initialized');
  }
  return database;
};

const getUsersCollection = () => {
  if (!usersCollection) {
    throw new Error('Users collection not initialized');
  }
  return usersCollection;
};

const getAppointmentsCollection = () => {
  if (!appointmentsCollection) {
    throw new Error('Appointments collection not initialized');
  }
  return appointmentsCollection;
};

const getClientDataCollection = () => {
  if (!clientDataCollection) {
    throw new Error('Client data collection not initialized');
  }
  return clientDataCollection;
};

module.exports = {
  connectToDatabase,
  getDatabase,
  getUsersCollection,
  getAppointmentsCollection,
  getClientDataCollection
};
