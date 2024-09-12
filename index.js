const express = require('express');
const { Client, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode');

// Initialize the app and WhatsApp client
const app = express();
const client = new Client();

let qrCodeData = ''; // Store the QR code data temporarily

client.on('qr', (qr) => {
    // Save the QR code string to be rendered later
    qrCodeData = qr;
    console.log('QR RECEIVED');
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
    const senderNumber = msg.from.replace('@c.us', ''); // Remove the @c.us suffix
    const messageBody = msg.body; // The actual message content

    // Log the sender's phone number and the message
    console.log(`Message received from ${senderNumber}: ${messageBody}`);
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

client.initialize();

// Middleware to parse JSON body
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("Express server")
})

// Serve the QR code on the /show-qr route
app.get('/show-qr', (req, res) => {
    if (qrCodeData) {
        // Generate QR code image and send it as a response
        qrcode.toDataURL(qrCodeData, (err, url) => {
            if (err) {
                return res.send('Error generating QR code');
            }
            // Send an HTML page that displays the QR code
            res.send(`
                <html>
                    <body>
                        <h1>Scan the QR code with WhatsApp</h1>
                        <img src="${url}" alt="QR Code" />
                    </body>
                </html>
            `);
        });
    } else {
        res.send('QR code is not available. Please wait...');
    }
});

// Route to send a message to a specific number
app.get('/send-message', (req, res) => {
    // const { number, message } = req.body;
    const number = "916290232268"
    const message = "Hello"

    // Make sure the number and message are provided
    if (!number || !message) {
        return res.status(400).send('Please provide both number and message');
    }

    const formattedNumber = `${number}@c.us`; // Format the number for WhatsApp

    client.sendMessage(formattedNumber, message)
        .then(response => {
            res.status(200).send(`Message sent to ${number}`);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Failed to send message');
        });
});

// Route to send a button message to a specific number
app.get('/send-button', (req, res) => {
    const number = "916290232268"

    if (!number) {
        return res.status(400).send('Please provide a number');
    }

    const formattedNumber = `${number}@c.us`;

    // Create a button template
    const button = new Buttons(
        'Do you like our service?', // The message
        [
            { body: 'Yes' }, // First button
            { body: 'No' },  // Second button
            { body: 'Maybe' } // Third button
        ],
        'Feedback', // Header
        'Choose an option below' // Footer
    );

    client.sendMessage(formattedNumber, button)
        .then(response => {
            res.status(200).send(`Button message sent to ${number}`);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Failed to send button message');
        });
});

// Start the Express server
const PORT = 3000 || process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
