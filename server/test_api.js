const axios = require('axios');
const fs = require('fs');

async function testApi() {
    const tokenFile = 'd:/EUNHEE/mcp/server/kis_token.json';
    const token = JSON.parse(fs.readFileSync(tokenFile)).token;

    const APP_KEY = process.env.VITE_KIS_APP_KEY || 'PSsHnjH3K0X55MOK6GkI2G4lS292w55fHh9o';
    const APP_SECRET = process.env.VITE_KIS_APP_SECRET || 'Z281yRto2k7l/2T6xV1u5/z8K1v7qB6Z7f7b7k='; // Using placeholder, assuming the server has dotenv or AppKey is set. Actually, let's just use the server's own config.

    // Actually, let's just inject into the server to print it.
}
