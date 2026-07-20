const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer'); // For Photo Uploads
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer'); // For sending Emails
const axios = require('axios'); // Snipe-IT API કનેક્શન માટે

const app = express();
app.use(express.json());
app.use(cors());

// Make uploads folder static so images can be viewed in the dashboard
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Connection Pool
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'Prashant1209',
    database: 'akshaya_patra_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 🔑 Snipe-IT CONFIGURATION
const SNIPE_IT_URL = "http://localhost:8000/api/v1";
const SNIPE_IT_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiZjJmYjRmZTIyZDVjNDc0MzdlNmZmYjg3N2EzMDk1ZTU4NjdiYTVjM2M5NzhjMjE2ZjJkY2NmMTFmMWI2ZTdhNzBjOGJjYmNiNTE2MmQ0YjMiLCJpYXQiOjE3ODQ1NDkxNDIuMTUyMzAyLCJuYmYiOjE3ODQ1NDkxNDIuMTUyMzAzLCJleHAiOjI0MTU3MDExNDIuMTQ4NDc5LCJzdWIiOiIxIiwic2NvcGVzIjpbXX0.XVm_-mU3ppOLr-zRPFIJ5dp8NSqWVFaH0gl0KujShIIZo49NYV5p2UY9G8v3s8324TvT9CIptPjBWHewPINwqGGeABEr-5PqaITZc_iu2xpP5U2LgxChe7vX1tFg9yVFJFJjT-M4XTyKLxHwy-MOpCG3B3C9vTVxtj5WhRdq1x7DjL6C9BngHLpfjzvdRf_UKWNps_z7L2t5ASjXmgzleESHH2k1WY2O7GULIzfXF_StMfuuetKn3LWBYzOKzsSGsfNzfpArIWgKAdy33VsNtU1Yf1fOic26EYiMKho2VyqgonnsqzBiEQ2cG92v8CBJyCmO0sXRoMrIDoNJFdt0wzaKgzDZIEfY0aYrewy287qbetCPdNMXG-Oq3Oyhhida9v00sDNDbk0TuaiJ00gzANCXo8mgefRMw7JMlvLBAK2jdRFImgKGQJMbKNN3fnuoUuEPkVs8FLbuxZukHP9GYKesqzKVCyj9g9nZKAbFSxdO0JeIjRa6HbgIwBJ6iz23WltftNpAmUG2o4_bespIG2h6WSi6lQFVCdBWdojQwCJOJIaueFi6x9fJcyiBu2ADBlmwUTIAL0R7mC_m3pABNtQbzMCzQiZcilYlKfcbNbwJnVxGS1bQECmTzji9sIuUXPJ3yCXGn86lX9-oVboCxpb2qUXUSgQvP3d0zzI_-V0
"; // 👈 તમારો Snipe-IT API Token અહીં નાખો

// 📧 Gmail Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'service.tapfguj@gmail.com',
        pass: 'wiwr xflt fhhq dnda'    // 👈 અહીં તમારો 16-character App Password નાખો
    }
});


// ==================== ROUTES ====================

// 🚀 UPDATED REDIRECT ROUTE: Handles Numeric IDs and Direct Plain Tags
app.get('/hardware/:id', async (req, res) => {
    const incomingId = req.params.id.trim();
    console.log(`Received Hardware Request for ID: ${incomingId}`);

    // ૧. જો સ્કેન થયેલો કે ટાઈપ કરેલો આઈડી ઓલરેડી એસેટ ટેગ છે (જેમ કે TSF0149 અથવા CMP-XXXX)
    if (isNaN(incomingId)) {
        console.log(`🎯 Plain Asset Tag Identified: ${incomingId}. Fowarding straight to frontend view.`);
        // ડાયરેક્ટ ફ્રન્ટએન્ડના ઇન્ડેક્સ પેજ પર સાચો આઈડી પાસ કરીને મોકલી દો
        return res.redirect(`http://127.0.0.1:5501/index.html?id=${incomingId}`);
    }

    // ૨. જો સ્કેન થયેલો આઈડી માત્ર નંબર છે (જેમ કે 149), તો Snipe-IT માંથી તેનો સાચો Asset Tag લાવો
    try {
        console.log(`📡 Numeric ID Detected: ${incomingId}. Querying Snipe-IT Database...`);
        const response = await axios.get(`${SNIPE_IT_URL}/hardware/${incomingId}`, {
            headers: {
                'Authorization': `Bearer ${SNIPE_IT_KEY}`,
                'Accept': 'application/json'
            }
        });

        const assetData = response.data;
        if (assetData) {
            const assetTag = assetData.asset_tag || (assetData.rows && assetData.rows[0]?.asset_tag);
            if (assetTag) {
                console.log(`🎯 Snipe-IT Asset Tag Found: ${assetTag}. Redirecting to frontend...`);
                return res.redirect(`http://127.0.0.1:5501/index.html?id=${assetTag}`);
            }
        }
        return res.status(404).send("Equipment details not found in Snipe-IT context.");
    } catch (error) {
        console.error("QR Redirect Error:", error.message);
        return res.status(500).send("Server Error while processing request.");
    }
});


// 1. GET Route: Fetch all complaints (For Admin Dashboard)
app.get('/api/complaints', async (req, res) => {
    try {
        const q = "SELECT * FROM complaints ORDER BY id DESC";
        const [rows] = await db.query(q);
        return res.json(rows);
    } catch (error) {
        console.error("SQL Fetch Error:", error);
        return res.status(500).json({ error: "Database error occurred" });
    }
});


// 2. GET Route: Fetch Single Complaint by Complaint ID (For Live Tracking)
app.get('/api/complaints/:complaintId', async (req, res) => {
    try {
        const cId = req.params.complaintId;
        const q = "SELECT * FROM complaints WHERE complaintId = ? LIMIT 1";
        const [rows] = await db.query(q, [cId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Complaint not found" });
        }
        return res.json(rows[0]);
    } catch (error) {
        console.error("SQL Fetch Single Error:", error);
        return res.status(500).json({ error: "Database error occurred" });
    }
});


// 3. POST Route: Save complaint with photo and send Emails in the background
app.post('/api/complaints', upload.single('complaintImage'), async (req, res) => {
    try {
        const data = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const [rows] = await db.query("SELECT id FROM complaints ORDER BY id DESC LIMIT 1");
        let nextNum = 1;
        if (rows.length > 0) {
            nextNum = rows[0].id + 1;
        }
        const complaintId = `CMP-${String(nextNum).padStart(4, '0')}`;

        const query = `
            INSERT INTO complaints 
            (complaintId, assetId, assetTag, assetModel, assetManufacturer, assetLocation, assetStatus, userName, phone, category, email, title, description, priority, imagePath) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            complaintId, data.assetId, data.assetTag, data.assetModel, data.assetManufacturer,
            data.assetLocation, data.assetStatus, data.userName, data.phone, data.category,
            data.email, data.title, data.description, data.priority, imagePath
        ];

        await db.query(query, values);

        const adminEmail = "nikunj.bhavsar@akshayapatra.org";
        let headEmail = "service.tapfguj@gmail.com";

        if (data.category === "Electrical") {
            headEmail = "alpeshkumar.raval@akshayapatra.org, pratap.rathod@akshayapatra.org";
        } else if (data.category === "IT") {
            headEmail = "manoj.pandya@akshayapatra.org";
        } else if (data.category === "Kitchen/Production") {
            headEmail = "himanshu.singh@akshayapatra.org, pratap.rathod@akshayapatra.org";
        } else if (data.category === "Maintenance") {
            headEmail = "pratap.rathod@akshayapatra.org, alpeshkumar.raval@akshayapatra.org";
        } else if (data.category === "Mechanical") {
            headEmail = "pratap.rathod@akshayapatra.org";
        }

        const trackingUrl = `https://prashantmehta1207-netizen.github.io/QR-Based-Asset-Service-Management-System/track-complaint.html?id=${complaintId}`;

        const userMailOptions = {
            from: '"Akshaya Patra Portal" <service.tapfguj@gmail.com>',
            to: data.email,
            subject: `Complaint Registered Successfully: ${complaintId}`,
            html: `
                <h3>Hello ${data.userName},</h3>
                <p>Your complaint has been successfully registered on the Akshaya Patra Portal.</p>
                <ul>
                    <li><b>Complaint ID:</b> ${complaintId}</li>
                    <li><b>Category/Department:</b> ${data.category}</li>
                    <li><b>Title:</b> ${data.title}</li>
                    <li><b>Status:</b> Pending</li>
                </ul>
                <p>You can track the live status here: <a href="${trackingUrl}">Live Tracking Link</a></p>
                <br>
                <p>Best Regards,<br><b>Akshaya Patra Support Team</b></p>
            `
        };

        const adminMailOptions = {
            from: '"Complaint System" <service.tapfguj@gmail.com>',
            to: `${adminEmail}, ${headEmail}`,
            subject: `New Complaint Alert: ${complaintId} [${data.category}]`,
            html: `
                <h3>A new complaint has been submitted:</h3>
                <p><b>Raised By:</b> ${data.userName} (${data.phone})</p>
                <p><b>Complaint ID:</b> ${complaintId}</p>
                <p><b>Title:</b> ${data.title}</p>
                <p><b>Description:</b> ${data.description || 'No description provided.'}</p>
                <p><b>Priority:</b> ${data.priority}</p>
            `
        };

        transporter.sendMail(userMailOptions, (err, info) => {
            if (err) console.error("User email error: ", err);
            else console.log("User email sent: " + info.response);
        });

        transporter.sendMail(adminMailOptions, (err, info) => {
            if (err) console.error("Admin/Head email error: ", err);
            else console.log("Admin/Head email sent: " + info.response);
        });

        res.status(201).json({ success: true, complaintId: complaintId, imagePath: imagePath });

    } catch (error) {
        console.error("SQL Insert Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// 4. PUT Route: Update status, cost, and technician
app.put('/api/complaints/:id/status', async (req, res) => {
    try {
        const complaintId = req.params.id;
        const { status, totalCost, resolvedBy } = req.body;

        const finalCost = status === 'Resolved' ? (totalCost || 0) : 0;
        const finalResolvedBy = status === 'Resolved' ? (resolvedBy || 'Admin') : null;

        const query = "UPDATE complaints SET status = ?, totalCost = ?, resolvedBy = ? WHERE id = ?";
        await db.query(query, [status, finalCost, finalResolvedBy, complaintId]);

        res.json({ success: true, message: "Status, Cost, and Technician updated successfully" });
    } catch (error) {
        console.error("SQL Update Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// 5. POST Route: Re-open Complaint
app.post('/api/complaints/reopen', async (req, res) => {
    try {
        const { complaintId, status, remarks } = req.body;

        const query = "UPDATE complaints SET status = ?, description = CONCAT(description, ' | Re-open Reason: ', ?) WHERE complaintId = ?";
        const [result] = await db.query(query, [status || 'Pending', remarks || 'No reason provided', complaintId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Complaint not found to re-open" });
        }

        return res.json({ success: true, message: "Complaint re-opened successfully" });
    } catch (error) {
        console.error("SQL Reopen Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});


// 6. GET Route: Snipe-IT માંથી એસેટ ટેગ દ્વારા ડેટા લાવવા માટે
app.get('/api/snipe/asset/:tag', async (req, res) => {
    try {
        const assetTag = req.params.tag;

        const response = await axios.get(`${SNIPE_IT_URL}/hardware/bytag/${assetTag}`, {
            headers: {
                'Authorization': `Bearer ${SNIPE_IT_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (response.data && response.data.id) {
            const asset = response.data;
            return res.json({
                success: true,
                assetId: asset.id,
                assetTag: asset.asset_tag,
                assetModel: asset.model ? asset.model.name : 'N/A',
                assetManufacturer: asset.model && asset.model.manufacturer ? asset.model.manufacturer.name : 'N/A',
                assetLocation: asset.location ? asset.location.name : 'N/A',
                assetStatus: asset.status_label ? asset.status_label.name : 'N/A'
            });
        } else {
            return res.status(404).json({ success: false, error: "Asset not found in Snipe-IT" });
        }
    } catch (error) {
        console.error("Snipe-IT API Fetch Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to connect with Snipe-IT." });
    }
});


// Server Connection
const PORT = 3000;
const HOST = '0.0.0.0'; // આ લખવાથી સર્વર બધા જ નેટવર્ક ઈન્ટરફેસ પર સાંભળશે

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on: http://localhost:${PORT}`);
    console.log(`📱 Network Access (Mobile): http://10.192.21.22:${PORT}`);
    console.log('✅ Backend Email Service & Image Upload & Dynamic QR Redirect Ready!');
});
