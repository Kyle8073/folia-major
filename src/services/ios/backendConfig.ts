// Native endpoint configuration is injected before any provider module is imported.
export const IOS_BACKEND_IDS = ['netease', 'qq', 'kugou', 'spotify', 'ytm', 'bodian', 'qishui'] as const;
export type IosBackendId = typeof IOS_BACKEND_IDS[number];
export type IosBackendEndpoints = Partial<Record<IosBackendId, string>>;

declare global {
    interface Window {
        __FOLIA_IOS__?: { endpoints: IosBackendEndpoints };
    }
}

export const normalizeBackendUrl = (raw: string): string => {
    const text = raw.trim();
    if (!text) return '';
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error('Invalid backend URL');
    }
    return url.href.replace(/\/+$/, '');
};

export const getIosApiBase = (id: IosBackendId): string => {
    if (typeof window === 'undefined' || !window.__FOLIA_IOS__) return '';
    const value = window.__FOLIA_IOS__.endpoints[id];
    try { return typeof value === 'string' ? normalizeBackendUrl(value) : ''; }
    catch { return ''; }
};
