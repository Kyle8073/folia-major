import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server } from 'lucide-react';
import { FoliaNative, isNativeIos } from '../../../../../services/ios/nativeBridge';
import { Button, Row, Status } from '../../kit';

// Native backend settings remain reachable after initial setup and follow the app's current theme.
export default function IosBackendRows() {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    if (!isNativeIos()) return null;
    const configure = async () => {
        setBusy(true);
        setFailed(false);
        try {
            const result = await FoliaNative.configure();
            if (result.saved) window.location.reload();
        } catch (error) {
            console.warn('[FoliaIOS] Backend settings could not open', error);
            setFailed(true);
        } finally { setBusy(false); }
    };
    return (
        <Row label={t('iosPort.backends')} hint={t('iosPort.backendHint')}>
            {failed && <Status tone="error">{t('iosPort.configurationFailed')}</Status>}
            <Button icon={Server} disabled={busy} onClick={() => void configure()}>{t('iosPort.configure')}</Button>
        </Row>
    );
}
