
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // change to your MySQL username
    password: '', // change to your MySQL password
    database: 'chatbot' // the database you created earlier
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
    }
    console.log('Connected to MySQL');
});

// API Endpoints

// Check MySQL connection and document count
app.get('/api/check-connection', (req, res) => {
    db.query('SELECT COUNT(*) AS count FROM parks', (err, results) => {
        if (err) {
            return res.status(500).json({ connected: false, error: err.message });
        }
        res.status(200).json({
            connected: true,
            documentCount: results[0].count
        });
    });
});

// Get all unique states
app.get('/api/get-states', (req, res) => {
    db.query('SELECT DISTINCT state FROM parks', (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const states = results.map(row => row.state);
        res.status(200).json(states);
    });
});

// Get districts for a state
app.get('/api/get-districts', (req, res) => {
    const state = req.query.state;
    db.query('SELECT DISTINCT district FROM parks WHERE state = ?', [state], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const districts = results.map(row => row.district);
        res.status(200).json(districts);
    });
});

// Get places for a district
app.get('/api/get-places', (req, res) => {
    const district = req.query.district;
    db.query('SELECT name, chargesAdults, chargesChildren FROM parks WHERE district = ?', [district], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

// Get details for a specific place
app.get('/api/get-place-details', (req, res) => {
    const name = req.query.name;
    db.query('SELECT * FROM parks WHERE name = ?', [name], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Place not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Store chat data (for bookings)
app.post('/api/store-chat-data', (req, res) => {
    console.log('Booking received:', req.body);
    res.status(200).json({ message: 'Booking stored successfully' });
});
// const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'chatbot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Add this new endpoint
app.post('/api/store-ticket', async (req, res) => {
    try {
        const {
            booking_id,
            booking_date,
            adult_price,
            child_price,
            total_paid,
            additional_details
        } = req.body;

        const connection = await pool.getConnection();

        const [result] = await connection.execute(
            `INSERT INTO ticket_details 
       (booking_id, booking_date, adult_price, child_price, total_paid, additional_details) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                booking_id,
                booking_date,
                adult_price,
                child_price,
                total_paid,
                JSON.stringify(additional_details)
            ]
        );

        connection.release();

        res.status(200).json({
            success: true,
            insertId: result.insertId
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to store ticket details'
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// const express = require("express");
// const mysql = require("mysql2");
// const cors = require("cors");

// const app = express();
// const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API to fetch all unique states
app.get("/states", (req, res) => {
    const query = "SELECT DISTINCT state FROM parks";
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch states" });
        } else {
            res.json(results.map(row => row.state));
        }
    });
});

// API to fetch districts by state
app.get("/districts/:state", (req, res) => {
    const query = "SELECT DISTINCT district FROM parks WHERE state = ?";
    db.query(query, [req.params.state], (err, results) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch districts" });
        } else {
            res.json(results.map(row => row.district));
        }
    });
});

// API to fetch parks and museums by district
app.get("/places/:district", (req, res) => {
    const query = "SELECT name, category, chargesAdults, chargesChildren FROM parks WHERE district = ?";
    db.query(query, [req.params.district], (err, results) => {
        if (err) {
            res.status(500).json({ error: "Failed to fetch places" });
        } else {
            res.json(results);
        }
    });
});

// API Route to Save Data
app.post("/add-park", (req, res) => {
    const { state, district, city, name, category, chargesAdults, chargesChildren, email } = req.body;
    const query = `INSERT INTO parks (state, district, city, name, category, chargesAdults, chargesChildren, email)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [state, district, city, name, category, chargesAdults, chargesChildren, email], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Failed to save data" });
        } else {
            res.status(201).json({ message: "Data saved successfully in Parks table" });
        }
    });
});

// // Start Server
// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });
