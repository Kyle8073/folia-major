import type { MonetBackgroundTuning, Theme } from '../../../types';
import { MONET_BACKGROUND_HEIGHT, MONET_BACKGROUND_WIDTH, paintMonetBackground } from './monetBackgroundPaint';

// iOS 16.1 lacks worker Canvas 2D; keep this one-time background painting available on the main canvas.
export async function paintMonetOnMainThread(
    image: HTMLImageElement,
    colors: Pick<Theme, 'backgroundColor' | 'primaryColor' | 'accentColor'>,
    tuning: MonetBackgroundTuning,
    blurPx: number | null,
    wanted: () => boolean,
): Promise<Blob | null | undefined> {
    if (!wanted()) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = MONET_BACKGROUND_WIDTH;
    canvas.height = MONET_BACKGROUND_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return null;
    paintMonetBackground(context, image, colors, tuning, blurPx);
    return await new Promise(resolve => canvas.toBlob(blob => resolve(wanted() ? blob : undefined), 'image/jpeg', 0.92));
}
