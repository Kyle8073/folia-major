import { describe, expect, it, vi } from 'vitest';
import { NativeDirectoryHandle, serializeDirectoryHandles, hydrateDirectoryHandles } from '../../../src/services/ios/nativeFileHandles';

const port = {
    removeDirectory: vi.fn(async () => {}),
    statFile: vi.fn(async () => ({ name: 'song.mp3', size: 42, lastModified: 123 })),
    listDirectory: vi.fn(async () => ({ entries: [{ name: 'song.mp3', kind: 'file' as const }, { name: 'lyrics', kind: 'directory' as const }] })),
    readFile: vi.fn(async () => new File(['music'], 'song.mp3', { type: 'audio/mpeg' })),
};
describe('iOS directory handle persistence', () => {
    it('serializes without function values and restores readable file handles after restart', async () => {
        const root = new NativeDirectoryHandle('12345678-1234-1234-1234-123456789ABC', '', 'Music', port);
        const stored = serializeDirectoryHandles({ Music: root as unknown as FileSystemDirectoryHandle });
        const clone = structuredClone(stored);
        expect(JSON.stringify(clone)).not.toContain('readFile');
        const restored = hydrateDirectoryHandles(clone, port).Music;
        const handle = await restored.getFileHandle('song.mp3');
        expect(await (await handle.getFile()).text()).toBe('music');
        expect(port.readFile).toHaveBeenCalledWith({ root: root.root, path: 'song.mp3' });
    });
    it('reads snapshot metadata without loading audio bytes and releases copied folders', async () => {
        const root = new NativeDirectoryHandle('native-id', '', 'Music', port);
        const handle = await root.getFileHandle('song.mp3') as unknown as { getMetadata(): Promise<unknown> };
        port.readFile.mockClear();
        expect(await handle.getMetadata()).toEqual({ name: 'song.mp3', size: 42, lastModified: 123 });
        expect(port.readFile).not.toHaveBeenCalled();
        await root.release();
        expect(port.removeDirectory).toHaveBeenCalledWith({ root: 'native-id' });
    });
    it('rejects paths that can escape a selected folder and creation requests', async () => {
        const root = new NativeDirectoryHandle('root', '', 'Music', port);
        for (const name of ['../secret', '.', '..', '/tmp', 'a\\b', '', 'a/b']) {
            await expect(root.getFileHandle(name)).rejects.toThrow();
        }
        await expect(root.getFileHandle('song.mp3', { create: true })).rejects.toThrow();
        await expect(root.getDirectoryHandle('song.mp3')).rejects.toThrow();
    });
    it('retains browser handles on desktop and detects native handle identity', async () => {
        const browser = { kind: 'directory', name: 'Desktop' } as FileSystemDirectoryHandle;
        expect(hydrateDirectoryHandles(serializeDirectoryHandles({ Desktop: browser }), port).Desktop).toBe(browser);
        const root = new NativeDirectoryHandle('root', '', 'Music', port);
        expect(await root.isSameEntry(new NativeDirectoryHandle('root', '', 'Other label', port))).toBe(true);
    });
});
