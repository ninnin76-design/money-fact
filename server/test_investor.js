const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

const fs = require('fs');
const TOKEN_FILE = './real_token_cache.json';

async function getAccessToken() {
    if (fs.existsSync(TOKEN_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            if (new Date() < new Date(saved.expiry)) return saved.token;
        } catch (e) { }
    }
    const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const newToken = res.data.access_token;
    const newExpiry = new Date(new Date().getTime() + (res.data.expires_in - 60) * 1000);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token: newToken, expiry: newExpiry }));
    return newToken;
}

async function test() {
    try {
        const token = await getAccessToken();
        const r = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010900',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: '005930'
            }
        });
        if (!r.data.output) {
            console.log('Result Empty:', r.data);
            return;
        }
        console.log('Fields:', Object.keys(r.data.output[0]).join(', '));
        console.log('Sample data (Pension):', r.data.output[0].pnsn_ntby_qty);
        console.log('SUCCESS: Data Retrieved!');
    } catch (e) {
        console.log('Fail:', e.response?.status, e.response?.data);
    }
}
test();
