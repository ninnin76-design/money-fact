const axios = require('axios');
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

async function findPath() {
    try {
        const tRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const token = tRes.data.access_token;
        console.log("Token obtained.");

        const paths = [
            '/uapi/domestic-stock/v1/quotations/inquire-investor',
            '/uapi/domestic-stock/v1/quotations/investor',
            '/uapi/domestic-stock/v1/quotations/inquire-daily-investor',
            '/uapi/domestic-stock/v1/quotations/inquire-investor-trend',
            '/uapi/domestic-stock/v1/quotations/investor-trend'
        ];

        const trIds = ['FHKST01012200', 'FHKST01010900'];

        for (const path of paths) {
            for (const trId of trIds) {
                try {
                    console.log(`Testing Path: ${path} | TR_ID: ${trId}`);
                    const res = await axios.get(`${KIS_BASE_URL}${path}`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                            appkey: APP_KEY,
                            appsecret: APP_SECRET,
                            tr_id: trId,
                            custtype: 'P'
                        },
                        params: {
                            FID_COND_MRKT_DIV_CODE: 'J',
                            FID_INPUT_ISCD: '005930'
                        }
                    });

                    if (res.data.output && res.data.output.length > 0) {
                        console.log(`✅ FOUND SUCCESS! Path: ${path}, TR_ID: ${trId}`);
                        console.log("Sample Data:", res.data.output[0]);
                        return; // Found it
                    } else if (res.data.msg_cd) {
                        console.log(`❌ Failed: ${res.data.msg_cd} - ${res.data.msg1}`);
                    }
                } catch (e) {
                    // console.log(`Error on ${path}: ${e.response?.status}`);
                }
                await new Promise(r => setTimeout(r, 200));
            }
        }
        console.log("Scan complete. No match found.");

    } catch (e) {
        console.error("Token Error:", e.message);
    }
}
findPath();
