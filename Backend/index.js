const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 5000;
const URI = "mongodb://127.0.0.1:27017"; 
const SECRET_KEY = "medicare_secret_key";

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

    if (username === "admin" && password === "admin123") {
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '2h' });
        console.log(`🔐 Admin logged in successfully`);
        return res.json({ success: true, token });
    }
    
    console.log(`⚠️ Failed login attempt for: ${username}`);
    res.status(401).json({ success: false, message: "Invalid Credentials" });
});

// --- PATIENT PORTAL ROUTES ---
app.post('/patient/register', async (req, res) => {
    try {
        const { name, email, password, phone, dateOfBirth } = req.body;
        
        const existingPatient = await db.collection('Patient').findOne({ email });
        if (existingPatient) {
            return res.status(400).json({ error: "Email already registered" });
        }
        
        const newPatient = {
            name,
            email,
            password,
            phone,
            dateOfBirth,
            role: 'patient',
            createdAt: new Date()
        };
        
        const result = await db.collection('Patient').insertOne(newPatient);
        const token = jwt.sign({ id: result.insertedId, email, role: 'patient' }, SECRET_KEY, { expiresIn: '24h' });
        
        res.status(201).json({ 
            success: true, 
            token, 
            patient: { id: result.insertedId, name, email, role: 'patient' }
        });
    } catch (err) {
        console.error("Patient Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/patient/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const patient = await db.collection('Patient').findOne({ email, password, role: 'patient' });
        
        if (!patient) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        
        const token = jwt.sign({ id: patient._id, email: patient.email, role: 'patient' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ 
            success: true, 
            token, 
            patient: { id: patient._id, name: patient.name, email: patient.email, role: 'patient' }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/patient/my-appointments', async (req, res) => {
    try {
        const token = req.headers['x-auth-token'];
        if (!token) return res.status(401).json({ error: "No token provided" });
        
        const decoded = jwt.verify(token, SECRET_KEY);
        const patientId = decoded.id.toString();
        
        const appointments = await db.collection('Appoinment').find({ patientId }).toArray();
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/patient/doctors', async (req, res) => {
    try {
        const doctors = await db.collection('Doctor').find({}).toArray();
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/patient/request-appointment', async (req, res) => {
    try {
        const token = req.headers['x-auth-token'];
        if (!token) return res.status(401).json({ error: "No token provided" });
        
        const decoded = jwt.verify(token, SECRET_KEY);
        const { doctorId, doctorName, appointmentDate, reason } = req.body;
        
        const patient = await db.collection('Patient').findOne({ _id: new ObjectId(decoded.id) });
        
        const newAppointment = {
            patientId: decoded.id.toString(),
            patientName: patient.name,
            doctorId,
            doctorName,
            appointmentDate,
            reason,
            status: 'Pending',
            createdBy: 'patient',
            createdAt: new Date()
        };
        
        const result = await db.collection('Appoinment').insertOne(newAppointment);
        res.status(201).json({ success: true, appointmentId: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- UPDATE APPOINTMENT STATUS ---
app.put('/update/appointment/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await db.collection('Appoinment').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: status } }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "Appointment not found" });
        }
        
        res.json({ success: true, message: `Appointment ${status}` });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- UNIVERSAL CRUD ROUTES ---
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