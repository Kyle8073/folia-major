import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getIosApiBase, type IosBackendId } from './backendConfig';

// The gateway must implement the upstream desktop operation contract, not Spotify's public REST API.
export type RemoteOperationResult = { ok: true; data: unknown } | {
    ok: false;
    error: { code: string; message: string; stage?: string; upstreamCode?: string; reason?: string };
};

export async function requestRemoteOperation(
    provider: IosBackendId,
    operation: string,
    params: object,
): Promise<RemoteOperationResult> {
    const endpoint = getIosApiBase(provider);
    if (!endpoint) throw new Error('Backend is not configured');
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
            controller.abort();
            reject(new Error('Backend request timed out'));
        }, 30_000);
    });
    try {
        const pending = Capacitor.getPlatform() === 'ios'
            ? CapacitorHttp.request({
                url: endpoint, method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                data: { operation, params }, responseType: 'json',
                connectTimeout: 15_000, readTimeout: 30_000,
            }).then(result => new Response(JSON.stringify(result.data), { status: result.status }))
            : fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'include', body: JSON.stringify({ operation, params }), signal: controller.signal,
            });
        const response = await Promise.race([pending, deadline]);
        if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
        const result: unknown = await response.json();
        if (!result || typeof result !== 'object') throw new Error('Invalid backend response');
        const envelope = result as Record<string, unknown>;
        if (envelope.ok === true && Object.hasOwn(envelope, 'data')) return result as RemoteOperationResult;
        if (envelope.ok === false && envelope.error && typeof envelope.error === 'object') {
            const error = envelope.error as Record<string, unknown>;
            if (typeof error.code === 'string' && typeof error.message === 'string') return result as RemoteOperationResult;
        }
        throw new Error('Invalid backend response');
    } finally {
        clearTimeout(timeout);
    }
}
