class TokenStorage {
    private static ACCESS_TOKEN_KEY = 'access_token';
    private static REFRESH_TOKEN_KEY = 'refresh_token';
    // private static USER_KEY = 'user_data';

    static getAccessToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.ACCESS_TOKEN_KEY);
        }
        return null;
    }
    static setTokens(accessToken: string, refreshToken?: string) {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
            if (refreshToken) {
                localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
            }
        }
    }
}
export default TokenStorage;