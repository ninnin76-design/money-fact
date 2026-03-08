const axios = require('axios');
(async () => {
    try {
        const tokenRes = await axios.get('http://localhost:3000/api/token');
        const token = tokenRes.data.token;
        const res = await axios.get('https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/investor-trend-by-sector', {
            headers: {
                authorization: 'Bearer ' + token,
                appkey: 'PSTD4bW6gCgexw0pItuO5rA3eIfG1N1u0kC2',
                appsecret: '2WJON9ZgL+Qe/y+6OqStL/L74pE7I2H67wHqS9gW/y1+1/B010qjX8S6xK/0T92QYfX8910sLz0Xh/288G2/6Xy1Z/Q0e6X7H8nLg/bB0a8K0F3KzZp6s7s/aLdH73Xw0rVzTz7/X+Z0+P7ZqP6rLkV60T8A4u0jQ+Q0T+U4M2Xp+wX4T+8=',
                tr_id: 'FHKUP03500100',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'U',
                FID_INPUT_ISCD: '0013'
            }
        });
        const out = res.data.output;
        console.log('Result:', JSON.stringify(out, null, 2));
    } catch (e) {
        console.error('Error:', e.response ? JSON.stringify(e.response.data) : (e.message || e));
    }
})();
