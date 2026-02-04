const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function checkAlternativeHistory() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    console.log("Testing Alternative History (FHKST03010900) for Samsung (005930)...");
    const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor-trend`, {
        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST03010900', custtype: 'P' },
        params: {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: '005930',
            FID_ORG_ADJ_PRC: '0'
        }
    });

    console.log("Response CD:", invRes.data.rt_cd);
    console.log("Trend History Rows:", invRes.data.output?.length || 0);
    if (invRes.data.output?.length > 0) {
        console.log("Sample trend row:", invRes.data.output[0]);
    }
}
checkAlternativeHistory();
