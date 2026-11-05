import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestRemoteOperation } from '../../../src/services/ios/remoteOperation';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('native remote provider operation', () => {
    it('preserves the upstream operation envelope and cookies', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { uri: 'spotify:track:abc' } })));
        vi.stubGlobal('window', { __FOLIA_IOS__: { endpoints: { spotify: 'https://music.example/spotify' } } });
        vi.stubGlobal('fetch', fetcher);
        expect(await requestRemoteOperation('spotify', 'audio', { id: 'abc' })).toEqual({ ok: true, data: { uri: 'spotify:track:abc' } });
        const [url, init] = fetcher.mock.calls[0];
        expect(url).toBe('https://music.example/spotify');
        expect(init.credentials).toBe('include');
        expect(JSON.parse(init.body)).toEqual({ operation: 'audio', params: { id: 'abc' } });
    });
    it('settles on timeout even when the underlying native fetch ignores abort signals', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('window', { __FOLIA_IOS__: { endpoints: { spotify: 'https://music.example' } } });
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
        const result = expect(requestRemoteOperation('spotify', 'query', {})).rejects.toThrow('timed out');
        await vi.advanceTimersByTimeAsync(30_000);
        await result;
    });
    it('rejects malformed envelopes, HTTP errors and missing configuration', async () => {
        await expect(requestRemoteOperation('spotify', 'audio', {})).rejects.toThrow('not configured');
        vi.stubGlobal('window', { __FOLIA_IOS__: { endpoints: { spotify: 'https://music.example' } } });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
        await expect(requestRemoteOperation('spotify', 'audio', {})).rejects.toThrow('Invalid');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret', { status: 401 })));
        await expect(requestRemoteOperation('spotify', 'audio', {})).rejects.toThrow('HTTP 401');
    });
});
