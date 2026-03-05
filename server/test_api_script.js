const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY || 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = process.env.KIS_APP_SECRET || 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function test() {
    const t = JSON.parse(fs.readFileSync('real_token_cache.json', 'utf8')).token;
    try {
        const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/investor-trend-by-sector`, {
            headers: {
                authorization: `Bearer ${t}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKUP03500100',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'U',
                FID_INPUT_ISCD: '0013'
            }
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log(e.response ? e.response.data : e.message);
    }
}
test();
