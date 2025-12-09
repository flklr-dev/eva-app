require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.WEB_PORT || 5000;
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', { apiUrl: API_URL });
});

app.get('/login', (req, res) => {
  res.render('login', { apiUrl: API_URL });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { apiUrl: API_URL });
});

app.get('/change-password', (req, res) => {
  res.render('changePassword', { apiUrl: API_URL });
});

// Delete account endpoint for Google Play compliance
app.get('/delete-account', (req, res) => {
  const supportEmail = process.env.SUPPORT_EMAIL || 'developer@eva-alert.com';
  res.send(`
    <h1>Delete Account Request</h1>
    <p>To request account deletion, please contact our support team at:</p>
    <p>Email: ${supportEmail}</p>
    <p>We will process your request within 30 days and delete all associated data.</p>
    <p>Note: Location data and SOS alerts are automatically deleted after 90 days.</p>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Web Admin Dashboard running on http://localhost:${PORT}`);
  console.log(`✓ Connected to API: ${API_URL}`);
});
