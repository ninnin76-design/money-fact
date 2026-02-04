const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkStructure() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    // Check Investor Daily for Samsung
    const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012200', custtype: 'P' },
        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930' }
    });

    const daily = res.data.output || [];
    console.log(`Samsung Data Rows: ${daily.length}`);
    if (daily.length > 0) {
        const d = daily[0];
        console.log("Keys available:", Object.keys(d));
        console.log("Sample (Frgn/Orgn/Pnsn NTBY):", d.frgn_ntby_qty, d.orgn_ntby_qty, d.pnsn_ntby_qty);
    }
}
checkStructure();
