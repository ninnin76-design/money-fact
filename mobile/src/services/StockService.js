import { SERVER_URL } from '../constants/Config';

// [v4.3.0] 코다리 부장의 대수술! 
// 모든 KIS API 호출을 서버 프록시를 통해 처리하여 레이트 리미트를 원천 차단합니다.
// 앱은 절대로 KIS API와 직접 통신하지 않고, 오직 우리 서버하고만 대화합니다.
export const StockService = {
    isMarketOpen() {
        const now = new Date();
        const year = now.getFullYear();
        const month = ('0' + (now.getMonth() + 1)).slice(-2);
        const date = ('0' + now.getDate()).slice(-2);
        const dayStr = year.toString() + month + date;

        const HOLIDAYS = [
            '20260101', '20260216', '20260217', '20260218', '20260302',
            '20260501', '20260505', '20260525', '20261009', '20260924',
            '20260925', '20260926', '20260928', '20261225', '20261231'
        ];

        const day = now.getDay();
        const hour = now.getHours();
        const min = now.getMinutes();

        if (day === 0 || day === 6) return false;
        if (HOLIDAYS.indexOf(dayStr) !== -1) return false;

        const time = hour * 100 + min;
        return time >= 800 && time <= 2000;
    },

    async searchStock(keyword) {
        try {
            const res = await fetch(`${SERVER_URL}/api/search?keyword=${encodeURIComponent(keyword)}`);
            const data = await res.json();
            return data.result || [];
        } catch (e) {
            return [];
        }
    },

    // [v4.3.0] 서버 프록시를 통해 투자자 데이터를 가져옵니다.
    // 서버가 캐시 확인 → 미보유 시에만 KIS API 호출 → 속도 제한기 적용
    // 이전: 앱이 KIS API 직접 호출 (레이트 리미트 위험!)
    // 이후: 앱 → 서버 → (캐시 or KIS API) (안전!)
    async getInvestorData(code, force = false, needChart = false) {
        try {
            const chartParam = needChart ? '?chart=true' : '';
            const res = await fetch(`${SERVER_URL}/api/stock-daily/${code}${chartParam}`);
            const data = await res.json();

            if (data && data.daily && data.daily.length > 0) {
                return data.daily;
            }
            return [];
        } catch (e) {
            console.log(`[StockService] Server proxy failed for ${code}:`, e.message);
            return [];
        }
    },

    // [v4.3.0] 서버 프록시를 통해 현재가를 가져옵니다.
    // 서버가 장중에는 실시간 조회, 장외에는 캐시 종가를 반환합니다.
    async getCurrentPrice(code, force = false) {
        try {
            const res = await fetch(`${SERVER_URL}/api/stock-price/${code}`);
            const data = await res.json();
            return data || null;
        } catch (e) {
            console.log(`[StockService] Price proxy failed for ${code}:`, e.message);
            return null;
        }
    },

    analyzeSupply(dailyData) {
        if (!dailyData || dailyData.length < 3) return { fStreak: 0, iStreak: 0, sentiment: 50 };
        const getStreak = (type) => {
            let buyCount = 0; let sellCount = 0; let streakType = null;
            for (let i = 0; i < dailyData.length; i++) {
                const rawVal = type === 'F' ? dailyData[i].frgn_ntby_qty : dailyData[i].orgn_ntby_qty;
                const val = parseInt(rawVal) || 0;
                if (val > 0) { if (streakType === 'SELL') break; buyCount++; streakType = 'BUY'; }
                else if (val < 0) { if (streakType === 'BUY') break; sellCount++; streakType = 'SELL'; }
            }
            return buyCount > 0 ? buyCount : -sellCount;
        };
        const fStreak = getStreak('F');
        const iStreak = getStreak('I');
        let sentiment = 50 + (fStreak * 10) + (iStreak * 10);
        sentiment = Math.max(0, Math.min(100, sentiment));
        return { fStreak, iStreak, sentiment };
    },

    checkHiddenAccumulation(dailyData, accumDays = 5, buyDays = 3) {
        // [v5.5.1] 데이터 길이가 요청한 accumDays보다 모자라도, 있는 만큼은 분석을 수행하도록 유연하게 대응합니다.
        const checkDays = Math.min(dailyData.length, accumDays);
        if (!dailyData || checkDays < 2) return false; 

        let totalDailyRange = 0;
        // [v4.3.7] 주가 횡보 정체 판단은 '매집 포착 기준일(accumDays)' 동안 수행
        for (let i = 0; i < checkDays; i++) {
            if (!dailyData[i]) continue;
            const close = parseInt(dailyData[i].stck_clpr || 1);
            if (dailyData[i].stck_hgpr && dailyData[i].stck_lwpr) {
                const high = parseInt(dailyData[i].stck_hgpr);
                const low = parseInt(dailyData[i].stck_lwpr);
                totalDailyRange += ((high - low) / (close || 1)) * 100;
            } else totalDailyRange += Math.abs(parseFloat(dailyData[i].prdy_ctrt || 0));
        }

        const avgDailyRange = totalDailyRange / checkDays;
        const currentClose = parseInt(dailyData[0].stck_clpr || 0);
        const startDayClose = parseInt(dailyData[checkDays - 1].stck_clpr || 0);
        const periodChange = startDayClose > 0 ? ((currentClose - startDayClose) / startDayClose) * 100 : 0;

        const { fStreak, iStreak } = this.analyzeSupply(dailyData);
        const todayChange = Math.abs(parseFloat(dailyData[0].prdy_ctrt || 0));

        // [v4.3.7] 수급 연속성 판단은 '매수 포착 기준일(buyDays)'을 사용
        return avgDailyRange < 2.5 && todayChange < 3.0 && Math.abs(periodChange) < 3.0 && (fStreak >= buyDays || iStreak >= buyDays);
    },

    calculateVWAP(dailyData, days = 5) {
        if (!dailyData || dailyData.length === 0) return 0;
        let totalValue = 0; let totalVolume = 0;
        const actualDays = Math.min(dailyData.length, days);
        for (let i = 0; i < actualDays; i++) {
            const vol = parseInt(dailyData[i].acml_vol || 0);
            const price = parseInt(dailyData[i].stck_clpr || 0);
            if (vol > 0 && price > 0) { totalValue += (vol * price); totalVolume += vol; }
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
