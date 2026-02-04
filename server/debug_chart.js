const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function debugChart() {
    const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
    });
    const token = tRes.data.access_token;

    console.log("Checking Chart for Samsung (005930)...");
    const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`, {
        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST03010100', custtype: 'P' },
        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: '005930', FID_INPUT_DATE_1: '', FID_INPUT_DATE_2: '', FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
    });

    const output2 = res.data.output2 || [];
    console.log("Rows found:", output2.length);
    if (output2.length > 0) {
        console.log("First Row Keys:", Object.keys(output2[0]));
        console.log("Sample Data (Frgn Ntby, Orgn Ntby):", output2[0].stck_frgn_ntby_qty, output2[0].stck_orgn_ntby_qty);
    }
}
debugChart();
