
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KIS_CONFIG, STORAGE_KEYS, SERVER_URL } from '../constants/Config';

let memToken = null;
let memExpiry = null;
let tokenRequestPromise = null;

export const AuthService = {
    async getKisToken() {
        if (memToken && memExpiry && new Date() < memExpiry) {
            console.log('[Auth] Using In-Memory Token (Valid until:', memExpiry.toLocaleTimeString(), ')');
            return memToken;
        }

        if (tokenRequestPromise) {
            console.log('[Auth] Waiting for existing token request...');
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
                        console.log('[Auth] Using Storage Token (Valid until:', expDate.toLocaleTimeString(), ')');
                        memToken = token;
                        memExpiry = expDate;
                        return token;
                    } else {
                        console.log('[Auth] Storage Token expired or near expiry.');
                    }
                } else {
                    console.log('[Auth] No token found in Storage.');
                }

                // 2. Try Shared Token from Server (Optional fallback)
                try {
                    console.log('[Auth] Fetching Shared Token from Server...');
                    const serverRes = await axios.get(`${SERVER_URL}/api/token`, { timeout: 15000 });
                    if (serverRes.data && serverRes.data.token) {
                        const { token, expiry } = serverRes.data;
                        const expDate = new Date(expiry);
                        memToken = token;
                        memExpiry = expDate;
                        await AsyncStorage.setItem(STORAGE_KEYS.KIS_TOKEN, JSON.stringify({ token, expiry }));
                        console.log('[Auth] Success: Token acquired from Shared Server.');
                        return token;
                    }
                } catch (e) {
                    console.log('[Auth] Server token unavailable, fetching direct...');
                }

                // 3. Direct Fetch from KIS
                console.log('[Auth] Fetching NEW token directly from KIS API...');
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
                console.log('[Auth] Success: NEW KIS Token issued (Valid until:', newExpiry.toLocaleTimeString(), ')');
                return newToken;
            } catch (e) {
                console.error('[Auth Error]', e.message);
                return null;
            } finally {
                tokenRequestPromise = null;
            }
        })();

        return tokenRequestPromise;
    }
};
