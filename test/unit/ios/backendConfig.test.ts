import { afterEach, describe, expect, it, vi } from 'vitest';
import { getIosApiBase, normalizeBackendUrl } from '../../../src/services/ios/backendConfig';

afterEach(() => vi.unstubAllGlobals());
describe('iOS backend configuration', () => {
    it('normalizes HTTP endpoints and rejects embedded credentials and active URLs', () => {
        expect(normalizeBackendUrl(' https://music.example/api/// ')).toBe('https://music.example/api');
        expect(normalizeBackendUrl('http://192.168.1.2:3000')).toBe('http://192.168.1.2:3000');
        for (const value of ['javascript:alert(1)', 'https://user:pass@example.com', 'file:///tmp/a', 'https://music.example/?token=secret', 'https://a/#x']) {
            expect(() => normalizeBackendUrl(value)).toThrow();
        }
    });
    it('does not enable remote providers outside the native iOS runtime', () => {
        expect(getIosApiBase('spotify')).toBe('');
        vi.stubGlobal('window', { __FOLIA_IOS__: { endpoints: { spotify: 'https://music.example' } } });
        expect(getIosApiBase('spotify')).toBe('https://music.example');
        expect(getIosApiBase('qq')).toBe('');
        vi.stubGlobal('window', { __FOLIA_IOS__: { endpoints: { spotify: 'https://a:99999' } } });
        expect(getIosApiBase('spotify')).toBe('');
    });
});
