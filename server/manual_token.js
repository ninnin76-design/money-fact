const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

const fs = require('fs');
const TOKEN_FILE = './real_token_cache.json';

async function manualToken() {
    try {
        console.log('Requesting token...');
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const newToken = res.data.access_token;
        const newExpiry = new Date(new Date().getTime() + (res.data.expires_in - 60) * 1000);

        fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token: newToken, expiry: newExpiry }));
        console.log('Token Success & Saved to File!');
    } catch (e) {
        console.log('Token Fail:', e.response?.data || e.message);
        if (e.code) console.log('Error Code:', e.code);
    }
}
manualToken();
