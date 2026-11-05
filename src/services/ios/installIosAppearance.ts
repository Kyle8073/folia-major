import { useThemeSettingsStore } from '../../stores/useThemeSettingsStore';
import { FoliaNative, isNativeIos } from './nativeBridge';

// Match native sheets and status-bar contrast to the same theme preference as the web player.
export function installIosAppearance(): void {
    if (!isNativeIos()) return;
    const apply = () => {
        const state = useThemeSettingsStore.getState();
        void FoliaNative.setAppearance({ mode: state.followSystemTheme ? 'system' : state.isDaylight ? 'light' : 'dark' })
            .catch(error => console.warn('[FoliaIOS] Native appearance update failed', error));
    };
    apply();
    useThemeSettingsStore.subscribe((next, previous) => {
        if (next.followSystemTheme !== previous.followSystemTheme || next.isDaylight !== previous.isDaylight) apply();
    });
}
