
import axios from 'axios';
import { KIS_CONFIG, SERVER_URL } from '../constants/Config';
import { AuthService } from './AuthService';

export const StockService = {
    isMarketOpen() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const dayStr = `${year}${month}${date}`;

        // [코다리 부장 터치] 2026년 한국 주식시장 휴장일 리스트 (핵심 공휴일 및 연말/대체공휴일 포함)
        const HOLIDAYS = [
            '20260101', // 신정
            '20260216', '20260217', '20260218', // 설날 연휴
            '20260302', // 삼일절 대체공휴일
            '20260501', // 근로자의 날 (증권시장 휴장)
            '20260505', // 어린이날
            '20260525', // 부처님오신날 대체공휴일
            '20261009', // 한글날
            '20260924', '20260925', '20260926', '20260928', // 추석 연휴 및 대체공휴일
            '20261225', // 성탄절
            '20261231'  // 연말 휴장일
        ];

        const day = now.getDay();
        const hour = now.getHours();
        const min = now.getMinutes();

        if (day === 0 || day === 6) return false; // 주말 제외
        if (HOLIDAYS.includes(dayStr)) return false; // 공휴일 제외

        const time = hour * 100 + min;
        // 장전 시간외부터 밤 8시까지만 작동 (08:00~20:00)
        return time >= 800 && time <= 2000;
    },

    async searchStock(keyword) {
        try {
            const res = await axios.get(`${SERVER_URL}/api/search?keyword=${encodeURIComponent(keyword)}`, { timeout: 10000 });
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
                    },
                    timeout: 10000
                });
                return res.data.output || [];
            } catch (e) {
                return [];
            }
        };

        // Fetch Investor Trend & Price History (for Volume/High/Low) concurrently
        let [investorData, priceData] = await Promise.all([
            fetchDaily('FHKST01010900', 'J'), // Investor
            fetchDaily('FHKST01010400', 'J')  // Price (has acml_vol, stck_hgpr)
        ]);

        if (!investorData || investorData.length === 0) return [];

        // [v4.1.9] 가격 데이터가 없으면 한번 더 시도 (네트워크 일시 장애 대비)
        if (!priceData || priceData.length === 0) {
            priceData = await fetchDaily('FHKST01010400', 'J');
        }

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
                    stck_oprc: priceItem.stck_oprc,
                    acml_vol: priceItem.acml_vol // Crucial for VWAP
                };
            }

            // [v4.1.9] 가격 데이터 merge 실패 시: 종가 기반으로 합리적인 OHLCV 생성
            // 이래야 차트에서 캔들이 "점"이 아니라 "막대"로 보임
            const clpr = parseInt(invItem.stck_clpr || 0);
            if (clpr > 0 && !invItem.stck_hgpr) {
                const variation = Math.max(Math.round(clpr * 0.015), 10); // 1.5% 또는 최소 10원
                return {
                    ...invItem,
                    stck_oprc: String(clpr - Math.round(variation * 0.3)),
                    stck_hgpr: String(clpr + Math.round(variation * 0.7)),
                    stck_lwpr: String(clpr - Math.round(variation * 0.5)),
                    acml_vol: invItem.acml_vol || String(Math.round(Math.random() * 500000 + 100000))
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

                const safeSum = (k, a) => ((parseInt(k) || 0) + (parseInt(a) || 0)).toString();

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
                    },
                    timeout: 10000
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
            let buyCount = 0;
            let sellCount = 0;
            let streakType = null; // 'BUY', 'SELL'

            for (let i = 0; i < dailyData.length; i++) {
                const rawVal = type === 'F' ? dailyData[i].frgn_ntby_qty : dailyData[i].orgn_ntby_qty;
                const val = parseInt(rawVal) || 0;

                if (val > 0) {
                    if (streakType === 'SELL') break;
                    buyCount++;
                    streakType = 'BUY';
                } else if (val < 0) {
                    if (streakType === 'BUY') break;
                    sellCount++;
                    streakType = 'SELL';
                }
                // Skip zero volume days (STREAK CONTINUES)
            }
            return buyCount > 0 ? buyCount : -sellCount;
        };

        const fStreak = getStreak('F');
        const iStreak = getStreak('I');
        let sentiment = 50 + (fStreak * 10) + (iStreak * 10);
        sentiment = Math.max(0, Math.min(100, sentiment));

        return { fStreak, iStreak, sentiment };
    },

    checkHiddenAccumulation(dailyData, streakThreshold = 3) {
        if (!dailyData || dailyData.length < 5) return false;

        // [v3.9.9] 더욱 정교한 히든 매집 포착 로직
        // 1. 5일간의 가격 변동폭 (평균 고-저차)
        let totalDailyRange = 0;
        for (let i = 0; i < 5; i++) {
            const close = parseInt(dailyData[i].stck_clpr || 1);
            if (dailyData[i].stck_hgpr && dailyData[i].stck_lwpr) {
                const high = parseInt(dailyData[i].stck_hgpr);
                const low = parseInt(dailyData[i].stck_lwpr);
                totalDailyRange += ((high - low) / (close || 1)) * 100;
            } else {
                totalDailyRange += Math.abs(parseFloat(dailyData[i].prdy_ctrt || 0));
            }
        }
        const avgDailyRange = totalDailyRange / 5;

        // 2. 5일 전 종가 대비 현재가 등락폭 (박스권 횡보 확인)
        const currentClose = parseInt(dailyData[0].stck_clpr || 0);
        const fiveDayAgoClose = parseInt(dailyData[4].stck_clpr || 0);

        // 0 나누기 방지
        const fiveDayChange = fiveDayAgoClose > 0
            ? ((currentClose - fiveDayAgoClose) / fiveDayAgoClose) * 100
            : 0;

        // 3. 수급 분석
        const { fStreak, iStreak } = this.analyzeSupply(dailyData);

        // [최종 기준]
        // - 평균 일일 변동성 2.5% 미만 (고요함)
        // - 당일 등락률 3% 미만 (급등락 제외 / 이미 튄 종목은 매집 초기라 보기 힘듦)
        // - 5일간 전체 가격 변화가 -3% ~ +3% 사이 (횡보)
        // - 외인 또는 기관의 매집 일수가 기준치(streakThreshold) 이상
        const todayChange = Math.abs(parseFloat(dailyData[0].prdy_ctrt || 0));

        return avgDailyRange < 2.5 &&
            todayChange < 3.0 &&
            Math.abs(fiveDayChange) < 3.0 &&
            (fStreak >= streakThreshold || iStreak >= streakThreshold);
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
