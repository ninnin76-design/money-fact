
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KIS_CONFIG, STORAGE_KEYS, SERVER_URL } from '../constants/Config';

let memToken = null;
let memExpiry = null;
let tokenRequestPromise = null;

export const AuthService = {
    async getKisToken() {
        if (memToken && memExpiry && new Date() < memExpiry) {
            return memToken;
        }

        if (tokenRequestPromise) {
            return tokenRequestPromise;
        }

        tokenRequestPromise = (async () => {
            try {
                // 1. Check local storage
                const saved = await AsyncStorage.getItem(STORAGE_KEYS.KIS_TOKEN);
                if (saved) {
                    const { token, expiry } = JSON.parse(saved);
                    const expDate = new Date(expiry);
                    const safeNow = new Date(new Date().getTime() + 10 * 60 * 1000);

                    if (safeNow < expDate) {
                        memToken = token;
                        memExpiry = expDate;
                        return token;
                    }
                }

                // 2. Try Shared Token from Server (Optional fallback)
                try {
                    const serverRes = await axios.get(`${SERVER_URL}/api/token`, { timeout: 15000 });
                    if (serverRes.data && serverRes.data.token) {
                        const { token, expiry } = serverRes.data;
                        const expDate = new Date(expiry);
                        memToken = token;
                        memExpiry = expDate;
                        await AsyncStorage.setItem(STORAGE_KEYS.KIS_TOKEN, JSON.stringify({ token, expiry }));
                        return token;
                    }
                } catch (e) {
                    // Fallback to direct fetch
                }

                // 3. Direct Fetch from KIS
                const res = await axios.post(`${KIS_CONFIG.BASE_URL}/oauth2/tokenP`, {
                    grant_type: 'client_credentials',
                    appkey: KIS_CONFIG.APP_KEY,
                    appsecret: KIS_CONFIG.APP_SECRET
                }, { timeout: 10000 });

                const newToken = res.data.access_token;
                // Force a 23 hour expiry fallback regardless of expires_in
                const expiresInSec = res.data.expires_in ? parseInt(res.data.expires_in, 10) : 86400;
                const actualExpiresIn = Math.min(expiresInSec, 86400);
                const newExpiry = new Date(new Date().getTime() + (actualExpiresIn - 300) * 1000);

                memToken = newToken;
                memExpiry = isNaN(newExpiry.getTime()) ? new Date(new Date().getTime() + 23 * 3600 * 1000) : newExpiry;
                await AsyncStorage.setItem(STORAGE_KEYS.KIS_TOKEN, JSON.stringify({ token: newToken, expiry: newExpiry }));
                return newToken;
            } catch (e) {
                return null;
            } finally {
                tokenRequestPromise = null;
            }
        })();

        return tokenRequestPromise;
    }
};
