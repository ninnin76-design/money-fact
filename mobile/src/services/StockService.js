
import axios from 'axios';
import { KIS_CONFIG, SERVER_URL } from '../constants/Config';
import { AuthService } from './AuthService';

export const StockService = {
    isMarketOpen() {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const min = now.getMinutes();
        if (day === 0 || day === 6) return false; // Weekend
        const time = hour * 100 + min;
        // Extended hours (Pre-market, Standard, After-hours, and Overnight sessions covers 08:00-20:00)
        return time >= 800 && time <= 2000;
    },

    async searchStock(keyword) {
        try {
            const res = await axios.get(`${SERVER_URL}/api/search?keyword=${encodeURIComponent(keyword)}`);
            return res.data.result || [];
        } catch (e) {
            return [];
        }
    },

    async getInvestorData(code, force = false) {
        // [코다리 부장 터치] 장외 시간/주말에도 데이터가 하나도 없다면 한 번은 가져오게 길을 열어줍니다!
        if (!this.isMarketOpen() && !force) return null;

        const token = await AuthService.getKisToken();
        if (!token) return null;

        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const time = hour * 100 + min;
        const isAtsHour = (time >= 800 && time < 850) || (time >= 1530 && time <= 2000);

        const fetchDaily = async (trId, marketCode) => {
            const urlPath = trId === 'FHKST01010900' ? 'inquire-investor' : 'inquire-daily-price';
            try {
                const res = await axios.get(`${KIS_CONFIG.BASE_URL}/uapi/domestic-stock/v1/quotations/${urlPath}`, {
                    headers: {
                        authorization: `Bearer ${token}`,
                        appkey: KIS_CONFIG.APP_KEY,
                        appsecret: KIS_CONFIG.APP_SECRET,
                        tr_id: trId,
                        custtype: 'P'
                    },
                    params: {
                        FID_COND_MRKT_DIV_CODE: marketCode,
                        FID_INPUT_ISCD: code,
                        FID_PERIOD_DIV_CODE: 'D',
                        FID_ORG_ADJ_PRC: '0'
                    }
                });
                return res.data.output || [];
            } catch (e) {
                return [];
            }
        };

        // Fetch Investor Trend & Price History (for Volume/High/Low) concurrently
        const [investorData, priceData] = await Promise.all([
            fetchDaily('FHKST01010900', 'J'), // Investor
            fetchDaily('FHKST01010400', 'J')  // Price (has acml_vol, stck_hgpr)
        ]);

        if (!investorData || investorData.length === 0) return [];

        // Merge Price Data into Investor Data (Key: stck_bsop_date)
        const mergedList = investorData.map((invItem, index) => {
            // Price data might match date
            let priceItem = priceData.find(p => p.stck_bsop_date === invItem.stck_bsop_date);

            // Fallback: If price is missing for this date (e.g. sync delay), use the most recent price available
            if (!priceItem && priceData.length > 0) {
                // Try to align by index if dates mismatch slightly, or use the first one (latest)
                priceItem = priceData[index] || priceData[0];
            }

            if (priceItem) {
                return {
                    ...invItem,
                    stck_clpr: priceItem.stck_clpr,
                    stck_hgpr: priceItem.stck_hgpr,
                    stck_lwpr: priceItem.stck_lwpr,
                    acml_vol: priceItem.acml_vol // Crucial for VWAP
                };
            }
            return invItem;
        });

        // Handle ATS (Nextrade) Data Merging for TODAY
        if (isAtsHour) {
            const atsInvestor = await fetchDaily('FHKST01010900', 'NX');

            if (atsInvestor && atsInvestor.length > 0) {
                const krxToday = mergedList[0];
                const atsToday = atsInvestor[0];

                const safeSum = (k, a) => (parseInt(k || 0) + parseInt(a || 0)).toString();

                mergedList[0] = {
                    ...krxToday,
                    frgn_ntby_qty: safeSum(krxToday.frgn_ntby_qty, atsToday.frgn_ntby_qty),
                    orgn_ntby_qty: safeSum(krxToday.orgn_ntby_qty, atsToday.orgn_ntby_qty),
                    pnsn_ntby_qty: safeSum(krxToday.pnsn_ntby_qty, atsToday.pnsn_ntby_qty),
                    ivtg_ntby_qty: safeSum(krxToday.ivtg_ntby_qty, atsToday.ivtg_ntby_qty),
                    asst_ntby_qty: safeSum(krxToday.asst_ntby_qty, atsToday.asst_ntby_qty),
                    // ATS Investor might lack volume, but we at least add what's there if any
                    acml_vol: safeSum(krxToday.acml_vol, atsToday.acml_vol),
                    // Use ATS closing price if available
                    stck_clpr: atsToday.stck_clpr || krxToday.stck_clpr
                };
            }
        }

        return mergedList;
    },

    async getCurrentPrice(code, force = false) {
        // [코다리 부장 터치] 새벽이라도 데이터가 필요하다면(force) 조심스럽게 호출!
        if (!this.isMarketOpen() && !force) return null;

        const token = await AuthService.getKisToken();
        if (!token) return null;

        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const time = hour * 100 + min;

        // Nextrade ATS hours: 08:00-08:50 (Pre-market), 15:30-20:00 (After-market)
        const isAtsHour = (time >= 800 && time < 850) || (time >= 1530 && time <= 2000);


        // Standard KRX Price is always the baseline
        // Helper to fetch price with specific market code
        const fetchPrice = async (trId, marketCode) => {
            try {
                const res = await axios.get(`${KIS_CONFIG.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
                    headers: {
                        authorization: `Bearer ${token}`,
                        appkey: KIS_CONFIG.APP_KEY,
                        appsecret: KIS_CONFIG.APP_SECRET,
                        tr_id: trId
                    },
                    params: {
                        FID_COND_MRKT_DIV_CODE: marketCode,
                        FID_INPUT_ISCD: code
                    }
                });
                return res.data.output || null;
            } catch (e) {
                return null;
            }
        };

        // Standard KRX Price is always the baseline
        let krxData = await fetchPrice('FHKST01010100', 'J');

        if (isAtsHour) {
            // During ATS hours, try to get NEXTRADE price using 'NX' market code
            let atsData = await fetchPrice('FHKST01010100', 'NX');

            if (atsData) {
                // Normalize ATS price field if needed (sometimes KIS returns nxt_prpr)
                if (!atsData.stck_prpr && atsData.nxt_prpr) {
                    atsData.stck_prpr = atsData.nxt_prpr;
                }

                // If we have valid price, use it
                if (parseInt(atsData.stck_prpr || 0) > 0) {
                    return atsData;
                }
            }
        }

        return krxData;
    },

    analyzeSupply(dailyData) {
        if (!dailyData || dailyData.length < 3) return { fStreak: 0, iStreak: 0, sentiment: 50 };

        const getStreak = (type) => {
            let buy = 0, sell = 0;
            let streakStarted = false;

            for (let i = 0; i < dailyData.length; i++) {
                const val = parseInt(type === 'F' ? dailyData[i].frgn_ntby_qty : dailyData[i].orgn_ntby_qty);

                if (val > 0) {
                    if (sell > 0) break;
                    buy++;
                    streakStarted = true;
                } else if (val < 0) {
                    if (buy > 0) break;
                    sell++;
                    streakStarted = true;
                } else if (streakStarted) break;
            }
            return buy > 0 ? buy : -sell;
        };

        const fStreak = getStreak('F');
        const iStreak = getStreak('I');
        let sentiment = 50 + (fStreak * 10) + (iStreak * 10);
        sentiment = Math.max(0, Math.min(100, sentiment));

        return { fStreak, iStreak, sentiment };
    },

    checkHiddenAccumulation(dailyData) {
        if (!dailyData || dailyData.length < 5) return false;

        // Check volatility for last 5 days (< 3% average)
        let totalVolatiltiy = 0;
        for (let i = 0; i < 5; i++) {
            const close = parseInt(dailyData[i].stck_clpr);

            if (dailyData[i].stck_hgpr && dailyData[i].stck_lwpr) {
                const high = parseInt(dailyData[i].stck_hgpr);
                const low = parseInt(dailyData[i].stck_lwpr);
                totalVolatiltiy += ((high - low) / close) * 100;
            } else {
                // Fallback: Use absolute daily change % if High/Low missing
                const changeRate = Math.abs(parseFloat(dailyData[i].prdy_ctrt || 0));
                totalVolatiltiy += changeRate;
            }
        }
        const avgVol = totalVolatiltiy / 5;

        const { fStreak, iStreak } = this.analyzeSupply(dailyData);

        // Hidden if Volatility is low but either F or I is buying for 3+ days
        return avgVol < 3 && (fStreak >= 3 || iStreak >= 3);
    },

    calculateVWAP(dailyData, days = 5) {
        if (!dailyData || dailyData.length === 0) return 0;

        let totalValue = 0;
        let totalVolume = 0;
        const actualDays = Math.min(dailyData.length, days);

        for (let i = 0; i < actualDays; i++) {
            const vol = parseInt(dailyData[i].acml_vol || 0);
            const price = parseInt(dailyData[i].stck_clpr || 0);

            if (vol > 0 && price > 0) {
                totalValue += (vol * price);
                totalVolume += vol;
            }
        }

        if (totalVolume === 0) return 0;
        const vwap = Math.round(totalValue / totalVolume);
        return isNaN(vwap) ? 0 : vwap;
    },

    getNetBuyAmount(dailyData, days = 1, type = 'ALL') {
        if (!dailyData || dailyData.length === 0) return 0;

        const safeParse = (val) => {
            if (!val) return 0;
            const parsed = parseInt(String(val).trim());
            return isNaN(parsed) ? 0 : parsed;
        };

        let totalAmount = 0;
        const actualDays = Math.min(dailyData.length, days);

        for (let i = 0; i < actualDays; i++) {
            const price = safeParse(dailyData[i].stck_clpr);
            let qty = 0;
            if (type === 'F') qty = safeParse(dailyData[i].frgn_ntby_qty);
            else if (type === 'I') qty = safeParse(dailyData[i].orgn_ntby_qty);
            else if (type === 'PNSN') qty = safeParse(dailyData[i].pnsn_ntby_qty);
            else if (type === 'IVTG') qty = safeParse(dailyData[i].ivtg_ntby_qty);
            else if (type === 'INS') qty = safeParse(dailyData[i].asst_ntby_qty);
            else qty = safeParse(dailyData[i].frgn_ntby_qty) + safeParse(dailyData[i].orgn_ntby_qty);

            totalAmount += (qty * price);
        }
        return isNaN(totalAmount) ? 0 : totalAmount;
    }
};
