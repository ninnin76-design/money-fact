
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, SERVER_URL } from '../constants/Config';

export const StorageService = {
    async saveMyStocks(stocks) {
        await AsyncStorage.setItem(STORAGE_KEYS.MY_STOCKS, JSON.stringify(stocks));
    },

    async loadMyStocks() {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEYS.MY_STOCKS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    async saveUserSectors(sectors) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_SECTORS, JSON.stringify(sectors));
    },

    async loadUserSectors() {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEYS.USER_SECTORS);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    },

    async backup(syncKey, stocks, settings, userSectors) {
        if (!syncKey) throw new Error('Nickname key is required');
        const payload = { syncKey, stocks, settings };
        // v3.6: 섹터 데이터도 함께 백업
        if (userSectors) {
            payload.watchlist = {
                version: 1,
                favorites: stocks,
                sectors: userSectors
            };
        }
        await fetch(`${SERVER_URL}/api/sync/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },

    async restore(syncKey) {
        if (!syncKey) throw new Error('Nickname key is required');
        const fetchRes = await fetch(`${SERVER_URL}/api/sync/load?syncKey=${syncKey}`);
        const res = { data: await fetchRes.json() };
        return res.data; // { stocks, settings, watchlist? }
    },

    async checkNickname(syncKey) {
        if (!syncKey) return false;
        try {
            const fetchRes = await fetch(`${SERVER_URL}/api/sync/load?syncKey=${syncKey}`);
            const res = { data: await fetchRes.json() };
            return res.data && res.data.stocks && res.data.stocks.length > 0;
        } catch (e) {
            return false;
        }
    }
};
