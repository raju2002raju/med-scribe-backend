const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

const uri = "mongodb+srv://royr55601:royr55601@cluster0.xra8inl.mongodb.net/medspa";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const database = client.db("medspa");

module.exports = {
    client,
    database,
    usersCollection: database.collection("users"),
    appointmentsCollection: database.collection("appointments"),
    clientDataCollection: database.collection("clientdatas"),
};
