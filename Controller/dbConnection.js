const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb+srv://royr55601:royr55601@cluster0.xra8inl.mongodb.net';
const dbName = 'medspa';
const collectionName = 'users';

async function getUserData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    // Query to fetch specific fields
    const query = {};
    const options = {
      projection: { _id: 0, name: 1, email: 1, phone: 1, profileImage: 1 },
    };

    const cursor = collection.find(query, options);
    const results = await cursor.toArray();

    console.log('Retrieved user data:');
    console.log(results);

    return results;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Call the function
getUserData().catch(console.error);