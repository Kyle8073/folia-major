import { spawnSync } from 'node:child_process';

// Keep server-only API compilation out of the on-device static asset build.
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, FOLIA_IOS: 'true' },
});
process.exit(result.status ?? 1);
