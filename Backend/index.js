const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); // Added for Auth
require('dotenv').config();

const app = express();
const PORT = 5000;
const URI = "mongodb://127.0.0.1:27017"; 
const SECRET_KEY = "medicare_secret_key"; // Use a strong key in .env for production

// 1. MIDDLEWARES
app.use(cors());
app.use(express.json()); 

let db;
const client = new MongoClient(URI);

const collectionMap = {
    'patients': 'Patient',
    'doctors': 'Doctor',
    'appointments': 'Appoinment', 
    'billing': 'Billing',
    'pharmacy': 'Pharmacy',
    'labtests': 'Lab_test'
};

async function start() {
    try {
        await client.connect();
        db = client.db("Hospital_Management_System"); 
        console.log("✅ 1. Connected to MongoDB");
        console.log("✅ 2. Using Database:", db.databaseName);

        app.listen(PORT, () => {
            console.log(`✅ 3. Server running on http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error("❌ Connection Error:", e);
    }
}

// --- AUTHENTICATION ROUTE ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Hardcoded credentials for staff portal
    // Username: admin | Password: admin123
    if (username === "admin" && password === "admin123") {
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '2h' });
        console.log(`🔐 Admin logged in successfully`);
        return res.json({ success: true, token });
    }
    
    console.log(`⚠️ Failed login attempt for: ${username}`);
    res.status(401).json({ success: false, message: "Invalid Credentials" });
});

// 2. UNIVERSAL CREATE (POST) ROUTE
app.post('/add/:collection', async (req, res) => {
    try {
        const collectionName = req.params.collection.toLowerCase();
        const target = collectionMap[collectionName] || collectionName;
        const data = req.body;

        console.log(`📥 Adding new record to: ${target}`);
        const result = await db.collection(target).insertOne(data);
        
        res.status(201).json({ message: "Success", id: result.insertedId });
    } catch (err) {
        console.error("POST Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. UNIVERSAL READ (GET) ROUTE
app.get('/get/:collection', async (req, res) => {
    try {
        const collectionName = req.params.collection.toLowerCase();
        const target = collectionMap[collectionName] || collectionName;
        
        const data = await db.collection(target).find({}).toArray();
        console.log(`🔎 GET request for: ${target} (Found ${data.length} records)`);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. UNIVERSAL DELETE ROUTE
app.delete('/delete/:collection/:id', async (req, res) => {
    try {
        const collectionName = req.params.collection.toLowerCase();
        const target = collectionMap[collectionName] || collectionName;
        const { id } = req.params;

        console.log(`🗑️ Deleting from: ${target} | ID: ${id}`);
        const result = await db.collection(target).deleteOne({ 
            _id: new ObjectId(id) 
        });

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send("Hospital Universal API is Online!"));

start();


