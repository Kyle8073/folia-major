import { afterEach, expect, it, vi } from 'vitest';
import { paintMonetOnMainThread } from '../../../src/components/visualizer/monet/monetMainThread';
import type { MonetBackgroundTuning, Theme } from '../../../src/types';
vi.mock('../../../src/components/visualizer/monet/monetBackgroundPaint', () => ({
    MONET_BACKGROUND_WIDTH: 1920, MONET_BACKGROUND_HEIGHT: 1080, paintMonetBackground: vi.fn(),
}));
afterEach(() => vi.unstubAllGlobals());
it('paints a Monet background when the native WebView has no OffscreenCanvas', async () => {
    const context = {};
    const blob = new Blob(['picture'], { type: 'image/jpeg' });
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: vi.fn(callback => callback(blob)) };
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    const image = {} as HTMLImageElement;
    expect(await paintMonetOnMainThread(image, {} as Theme, {} as MonetBackgroundTuning, null, () => true)).toBe(blob);
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
});
it('does not paint an image no layer wants any more', async () => {
    expect(await paintMonetOnMainThread({} as HTMLImageElement, {} as Theme, {} as MonetBackgroundTuning, null, () => false)).toBeUndefined();
});
