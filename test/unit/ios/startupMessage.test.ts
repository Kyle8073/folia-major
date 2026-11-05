import { expect, it } from 'vitest';
import { startupFailureMessage } from '../../../src/services/ios/startupMessage';

it('localizes startup failures without importing the app translation bundle', () => {
    expect(startupFailureMessage('zh-CN')).toContain('无法');
    expect(startupFailureMessage('zh-Hant')).toContain('無法');
    expect(startupFailureMessage('id')).toContain('tidak');
    expect(startupFailureMessage('en')).toContain('could not');
});
