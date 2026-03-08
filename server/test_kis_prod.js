const axios = require('axios');
(async () => {
    try {
        const appkey = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34'; // from mobile Config.js
        const appsecret = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk='; // from mobile Config.js
        console.log('App Key:', appkey);

        const resTok = await axios.post('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
            grant_type: 'client_credentials',
            appkey,
            appsecret
        });
        const token = resTok.data.access_token;
        console.log('Got token');

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
        console.log('Fields:', Object.keys(out).filter(k => k.includes('ntby')));
        console.log('프외', out.prdy_frgn_ntby_qty, out.prdy_frgn_ntby_tr_pbmn);
        console.log('프기', out.prdy_orgn_ntby_qty, out.prdy_orgn_ntby_tr_pbmn);
        console.log('pnsn (연기금)', out.pnsn_ntby_qty, out.pnsn_ntby_tr_pbmn);
        console.log('ivtg (투신)', out.ivtg_ntby_qty, out.ivtg_ntby_tr_pbmn);
        console.log('ins (보험)', out.ins_ntby_qty, out.ins_ntby_tr_pbmn);

    } catch (e) {
        console.error('Error:', e.response ? JSON.stringify(e.response.data) : (e.message || e));
    }
})();
