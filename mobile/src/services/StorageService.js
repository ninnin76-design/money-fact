
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { STORAGE_KEYS, SERVER_URL } from '../constants/Config';

export const StorageService = {
    async saveMyStocks(stocks) {
        await AsyncStorage.setItem(STORAGE_KEYS.MY_STOCKS, JSON.stringify(stocks));
    },

    async loadMyStocks() {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.MY_STOCKS);
        return saved ? JSON.parse(saved) : [];
    },

    async backup(syncKey, stocks, settings) {
        if (!syncKey) throw new Error('Nickname key is required');
        await axios.post(`${SERVER_URL}/api/sync/save`, { syncKey, stocks, settings });
    },

    async restore(syncKey) {
        if (!syncKey) throw new Error('Nickname key is required');
        const res = await axios.get(`${SERVER_URL}/api/sync/load?syncKey=${syncKey}`);
        return res.data; // Now returns { stocks, settings }
    },

    async checkNickname(syncKey) {
        if (!syncKey) return false;
        try {
            const res = await axios.get(`${SERVER_URL}/api/sync/load?syncKey=${syncKey}`);
            // If it returns stocks, it means it's exists (taken)
            return res.data && res.data.stocks && res.data.stocks.length > 0;
        } catch (e) {
            return false;
        }
    }
};
