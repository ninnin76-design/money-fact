const axios = require('axios');
(async () => {
    try {
        const appkey = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
        const appsecret = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

        const resTok = await axios.post('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
            grant_type: 'client_credentials',
            appkey,
            appsecret
        });
        const token = resTok.data.access_token;

        const res = await axios.get('https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/investor-trend-by-sector', {
            headers: {
                authorization: 'Bearer ' + token,
                appkey,
                appsecret,
                tr_id: 'FHKUP03500100',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'U',
                FID_INPUT_ISCD: '0013' // 반도체
            }
        });
        const out = res.data.output;
        console.log('Result:', JSON.stringify(out, null, 2));
    } catch (e) {
        console.error('Error:', e.response ? JSON.stringify(e.response.data) : (e.message || e));
    }
})();
