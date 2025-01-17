const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

// Initialize the Express app and WhatsApp client
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Persistent session storage
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, 'whatsapp-sessions'), // Store session data in a persistent directory
    }),
});

let qrCodeData = ''; // Store the QR code data temporarily

// Event listeners for the WhatsApp client
client.on('qr', (qr) => {
    qrCodeData = qr; // Save the QR code string to be rendered later
    console.log('QR Code received. Scan it using WhatsApp.');
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    qrCodeData = ''; // Clear QR code data when ready
});

client.on('authenticated', () => {
    console.log('WhatsApp client authenticated!');
});

client.on('auth_failure', (err) => {
    console.error('Authentication failed:', err);
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    qrCodeData = ''; // Clear QR code data if disconnected
    client.initialize(); // Attempt to reconnect
});

// Initialize the WhatsApp client
client.initialize();

// Basic route to check server status
app.get('/', (req, res) => {
    res.send('Express server is running');
});

// Route to serve the QR code for WhatsApp login
app.get('/show-qr', (req, res) => {
    if (qrCodeData) {
        // Generate and serve QR code image
        qrcode.toDataURL(qrCodeData)
            .then((url) => {
                res.send(`
                    <html>
                        <body>
                            <h1>Scan the QR code with WhatsApp</h1>
                            <img src="${url}" alt="QR Code" />
                        </body>
                    </html>
                `);
            })
            .catch((err) => {
                console.error('Error generating QR code:', err);
                res.status(500).send('Error generating QR code');
            });
    } else {
        res.send('QR code is not available. Please wait...');
    }
});

// Route to send a message to a specific number
app.get('/send-message/:number/:message', (req, res) => {
    const number = req.params.number;
    const message = decodeURIComponent(req.params.message);

    // Validate inputs
    if (!number || !message) {
        return res.status(400).send('Please provide both number and message');
    }

    // Check if the client is ready
    if (!client.info || !client.info.wid) {
        return res.status(500).send('WhatsApp client is not connected. Please try again later.');
    }

    const formattedNumber = `${number}@c.us`; // Format the number for WhatsApp

    client.sendMessage(formattedNumber, message)
        .then(() => {
            console.log(`Message sent to ${number}`);
            res.status(200).send(`Message sent to ${number}`);
        })
        .catch((err) => {
            console.error('Failed to send message:', err);
            res.status(500).send('Failed to send message');
        });
});

// Event listeners for additional logging/debugging
client.on('message', (message) => {
    console.log(`Message received from ${message.from}: ${message.body}`);
});

client.on('error', (err) => {
    console.error('WhatsApp client error:', err);
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
