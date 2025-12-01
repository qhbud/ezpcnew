const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

let db = null;

async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    db = client.db(DB_NAME);
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return db;
}

module.exports = {
  connectToDatabase,
  getDatabase
};
