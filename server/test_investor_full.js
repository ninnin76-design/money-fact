
const axios = require('axios');
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

async function test() {
    const res = await axios.post(KIS_BASE_URL + '/oauth2/tokenP', { grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET });
    const token = res.data.access_token;

    const code = '005930'; // Samsung
    console.log(`--- Full Data for ${code} ---`);

    // Inquire Investor (FHKST01010900)
    const invRes = await axios.get(KIS_BASE_URL + '/uapi/domestic-stock/v1/quotations/inquire-investor', {
        headers: { authorization: 'Bearer ' + token, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
    });
    console.log('Investor Data Output[0]:', JSON.stringify(invRes.data.output[0], null, 2));

    // Inquire Price (FHKST01010100)
    const priceRes = await axios.get(KIS_BASE_URL + '/uapi/domestic-stock/v1/quotations/inquire-price', {
        headers: { authorization: 'Bearer ' + token, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100', custtype: 'P' },
        params: { fid_cond_mrkt_div_code: 'J', fid_input_iscd: code } // Use lowercase params for Price TR
    });
    console.log('Price Data Output:', JSON.stringify(priceRes.data.output, null, 2));
}
test();
