import { Capacitor, registerPlugin } from '@capacitor/core';
import { type IosBackendEndpoints } from './backendConfig';
import type { NativeFilePort } from './nativeFileHandles';

// Keep Capacitor imports at this boundary; handle persistence is independently testable.
interface FoliaNativePlugin {
    setAppearance(options: { mode: 'system' | 'light' | 'dark' }): Promise<void>;
    configuration(): Promise<{ endpoints: IosBackendEndpoints }>;
    configure(): Promise<{ saved: boolean; endpoints: IosBackendEndpoints }>;
    pickDirectory(): Promise<{ root: string; name: string }>;
    removeDirectory(options: { root: string }): Promise<void>;
    listDirectory: NativeFilePort['listDirectory'];
    resolveFile(options: { root: string; path: string }): Promise<{ url: string; size: number; modified: number }>;
}
export const FoliaNative = registerPlugin<FoliaNativePlugin>('FoliaNative');
export const isNativeIos = (): boolean => Capacitor.getPlatform() === 'ios';
export const nativeFilePort: NativeFilePort = {
    removeDirectory: options => FoliaNative.removeDirectory(options),
    async statFile(options) {
        const source = await FoliaNative.resolveFile(options);
        return { size: source.size, lastModified: source.modified, name: options.path.split('/').at(-1) ?? '' };
    },
    listDirectory: options => FoliaNative.listDirectory(options),
    async readFile(options) {
        const source = await FoliaNative.resolveFile(options);
        const response = await fetch(Capacitor.convertFileSrc(source.url));
        if (!response.ok) throw new Error('Imported file is unavailable');
        const blob = await response.blob();
        return new File([blob], options.path.split('/').at(-1) ?? 'audio', {
            type: blob.type,
            lastModified: source.modified,
        });
    },
};
