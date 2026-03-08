require('dotenv').config();
const axios = require('axios');
(async () => {
    try {
        const appkey = process.env.KIS_APP_KEY;
        const appsecret = process.env.KIS_APP_SECRET;

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
        console.log('qty:', out.prdy_frgn_ntby_qty);
        console.log('tr_pbmn:', out.prdy_frgn_ntby_tr_pbmn);
    } catch (e) {
        console.error('Error:', e.response ? JSON.stringify(e.response.data) : (e.message || e));
    }
})();
