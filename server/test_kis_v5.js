const axios = require('axios');
(async () => {
    try {
        const appkey = 'PSktI7fcn6YHeQ0dMSzJlAjb0mYLmHoYImNL';
        const appsecret = 'uxLk5zL+ozOiV8NarXq0kt0E7GOsHt+Alb4S8k2CciUL6VXlK4hnF8tW+wzE7DZ1vY8lfo6EVVd3ldhy906b6mDKtnVi+ksgq8uqnzhsUM0B+ipW9MjmLZNxeRPBByUtG5/k/j5xGt1+ZwVafwmiOniz0cDM+1pWsCiJYirzrmuXQI52hR0=';

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
