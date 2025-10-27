const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting WhatsApp Pair Bot...');

// Store pair codes
const userPairCodes = new Map();
const activePairCodes = new Map();

// Initialize WhatsApp client with Render-compatible settings
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Generate 8-character pair code
function generatePairCode() {
    let code;
    do {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
    } while (activePairCodes.has(code));
    return code;
}

// Web server
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>WhatsApp Pair Bot</title></head>
        <body>
            <h1>🤖 WhatsApp Pair Bot</h1>
            <p>Bot is running! Users: ${userPairCodes.size}</p>
            <p>Send !pair to get your code</p>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'running', users: userPairCodes.size });
});

// WhatsApp Events
client.on('qr', (qr) => {
    console.log('🔐 SCAN THIS QR CODE:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ BOT READY! Users can message !pair');
});

client.on('message', async (message) => {
    if (message.isGroupMsg || message.isStatus) return;

    const content = message.body.toLowerCase().trim();
    const from = message.from;
    const senderName = message._data.notifyName || 'User';

    try {
        switch (content) {
            case '!pair':
                const pairCode = generatePairCode();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                
                userPairCodes.set(from, { code: pairCode, name: senderName });
                activePairCodes.set(pairCode, { phone: from, expiresAt: expiresAt });

                await message.reply(`✅ PAIR CODE: ${pairCode}\n⏰ Expires: 24 hours`);
                break;

            case '!help':
                await message.reply('Commands: !pair, !help, !status');
                break;

            case '!status':
                await message.reply(`🤖 Status: Online\nUsers: ${userPairCodes.size}`);
                break;
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Start everything
async function startBot() {
    console.log('Starting server...');
    app.listen(PORT, () => {
        console.log(`🌐 Server running on port ${PORT}`);
    });
    
    console.log('Initializing WhatsApp...');
    await client.initialize();
}

startBot().catch(console.error);