const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

// Initialize the app and WhatsApp client
const app = express();

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all origins
app.use(cors());

const client = new Client({
    authStrategy: new LocalAuth(), // Enable session persistence
});

let qrCodeData = ''; // Store the QR code data temporarily

// Event listeners for WhatsApp client
client.on('qr', (qr) => {
    qrCodeData = qr; // Save the QR code string to be rendered later
    console.log('QR RECEIVED');
});

client.on('ready', () => {
    console.log('Client is ready!');
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
});


// Initialize the WhatsApp client
client.initialize();

// Middleware to parse JSON body
app.use(express.json());

// Basic route to check server status
app.get("/", (req, res) => {
    res.send("Express server is running");
});

app.get("/ping", (req, res) => {
    res.send("ping");
});


// Serve the QR code on the /show-qr route
app.get('/show-qr', (req, res) => {
    if (qrCodeData) {
        // Generate QR code image and send it as a response
        qrcode.toDataURL(qrCodeData)
            .then(url => {
                res.send(`
                    <html>
                        <body>
                            <h1>Scan the QR code with WhatsApp</h1>
                            <img src="${url}" alt="QR Code" />
                        </body>
                    </html>
                `);
            })
            .catch(err => {
                console.error('Error generating QR code:', err);
                res.status(500).send('Error generating QR code');
            });
    } else {
        res.send('QR code is not available. Please wait...');
    }
});

// Route to send a message to a specific number
app.get('/send-message/:number/:message', (req, res) => {
    // const { number, message } = req.params;
    const number = req.params.number;
    const message = decodeURIComponent(req.params.message);


    // Ensure the number and message are provided
    if (!number || !message) {
        return res.status(400).send('Please provide both number and message');
    }

    const formattedNumber = `${number}@c.us`; // Format the number for WhatsApp

    client.sendMessage(formattedNumber, message)
        .then(response => {
            console.log(`Message sent to ${number}`);
            res.status(200).send(`Message sent to ${number}`);
        })
        .catch(err => {
            console.error('Failed to send message:', err);
            res.status(500).send('Failed to send message');
        });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
