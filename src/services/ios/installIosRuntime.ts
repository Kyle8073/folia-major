import { FoliaNative, isNativeIos } from './nativeBridge';
import { setStoredBoolean } from '../../stores/storagePrimitives';

// Run before bootstrap imports stores and providers, so their initial configuration is correct.
export async function installIosRuntime(): Promise<void> {
    if (!isNativeIos()) return;
    await import('core-js/actual');
    if (typeof AbortSignal.timeout !== 'function') {
        AbortSignal.timeout = (milliseconds: number) => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), milliseconds);
            return controller.signal;
        };
    }
    const configuration = await FoliaNative.configuration();
    window.__FOLIA_IOS__ = { endpoints: configuration.endpoints };
    document.documentElement.dataset.foliaIos = 'true';
    if (localStorage.getItem('follow_system_theme') === null && localStorage.getItem('default_theme_daylight') === null) {
        setStoredBoolean('follow_system_theme', true);
    }
}
