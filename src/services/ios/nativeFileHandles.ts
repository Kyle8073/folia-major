// Read-only FileSystem-compatible handles; only data descriptors are persisted in IndexedDB.
export interface NativeFilePort {
    listDirectory(options: { root: string; path: string }): Promise<{ entries: Array<{ name: string; kind: 'file' | 'directory' }> }>;
    removeDirectory(options: { root: string }): Promise<void>;
    statFile(options: { root: string; path: string }): Promise<{ size: number; lastModified: number; name: string }>;
    readFile(options: { root: string; path: string }): Promise<File>;
}
interface NativeHandleDescriptor {
    foliaNativeDirectory: 1;
    root: string;
    path: string;
    name: string;
}
const validName = (name: string): boolean => Boolean(name) && !['.', '..'].includes(name) && !/[\/\\\0]/.test(name);
const childPath = (path: string, name: string): string => {
    if (!validName(name)) throw new DOMException('Invalid file name', 'TypeMismatchError');
    return path ? `${path}/${name}` : name;
};

export class NativeFileHandle {
    readonly kind = 'file' as const;
    constructor(readonly root: string, readonly path: string, readonly name: string, private port: NativeFilePort) {}
    getMetadata() { return this.port.statFile({ root: this.root, path: this.path }); }
    getFile(): Promise<File> { return this.port.readFile({ root: this.root, path: this.path }); }
    async queryPermission(): Promise<PermissionState> { return 'granted'; }
    async requestPermission(): Promise<PermissionState> { return 'granted'; }
    async isSameEntry(other: { kind?: string; root?: string; path?: string }): Promise<boolean> {
        return other.kind === this.kind && other.root === this.root && other.path === this.path;
    }
}

export class NativeDirectoryHandle {
    readonly kind = 'directory' as const;
    constructor(readonly root: string, readonly path: string, readonly name: string, private port: NativeFilePort) {}
    release(): Promise<void> { return this.port.removeDirectory({ root: this.root }); }
    descriptor(): NativeHandleDescriptor { return { foliaNativeDirectory: 1, root: this.root, path: this.path, name: this.name }; }
    async queryPermission(): Promise<PermissionState> { return 'granted'; }
    async requestPermission(): Promise<PermissionState> { return 'granted'; }
    async isSameEntry(other: { kind?: string; root?: string; path?: string }): Promise<boolean> {
        return other.kind === this.kind && other.root === this.root && other.path === this.path;
    }
    async *entries(): AsyncGenerator<[string, FileSystemHandle]> {
        const { entries } = await this.port.listDirectory({ root: this.root, path: this.path });
        for (const entry of entries) {
            const path = childPath(this.path, entry.name);
            const handle = entry.kind === 'directory'
                ? new NativeDirectoryHandle(this.root, path, entry.name, this.port)
                : new NativeFileHandle(this.root, path, entry.name, this.port);
            yield [entry.name, handle as unknown as FileSystemHandle];
        }
    }
    async *values(): AsyncGenerator<FileSystemHandle> { for await (const [, handle] of this.entries()) yield handle; }
    async *keys(): AsyncGenerator<string> { for await (const [name] of this.entries()) yield name; }
    [Symbol.asyncIterator](): AsyncGenerator<[string, FileSystemHandle]> { return this.entries(); }
    private async child(name: string, kind: 'directory' | 'file', options?: { create?: boolean }): Promise<FileSystemHandle> {
        childPath(this.path, name);
        if (options?.create) throw new DOMException('Imported music is read-only', 'NoModificationAllowedError');
        for await (const [entry, handle] of this.entries()) {
            if (entry !== name) continue;
            if (handle.kind !== kind) throw new DOMException('Entry has a different type', 'TypeMismatchError');
            return handle;
        }
        throw new DOMException('Imported entry does not exist', 'NotFoundError');
    }
    async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
        return await this.child(name, 'file', options) as FileSystemFileHandle;
    }
    async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
        return await this.child(name, 'directory', options) as FileSystemDirectoryHandle;
    }
    async resolve(handle: { root?: string; path?: string }): Promise<string[] | null> {
        if (handle.root !== this.root || typeof handle.path !== 'string') return null;
        if (handle.path === this.path) return [];
        const prefix = this.path ? `${this.path}/` : '';
        return handle.path.startsWith(prefix) ? handle.path.slice(prefix.length).split('/') : null;
    }
    async removeEntry(): Promise<never> { throw new DOMException('Imported music is read-only', 'NoModificationAllowedError'); }
}

export function serializeDirectoryHandles(handles: Record<string, FileSystemDirectoryHandle>): Record<string, FileSystemDirectoryHandle | NativeHandleDescriptor> {
    return Object.fromEntries(Object.entries(handles).map(([name, handle]) => [name,
        handle instanceof NativeDirectoryHandle ? handle.descriptor() : handle]));
}

export function hydrateDirectoryHandles(
    handles: Record<string, FileSystemDirectoryHandle | NativeHandleDescriptor>,
    port: NativeFilePort,
): Record<string, FileSystemDirectoryHandle> {
    return Object.fromEntries(Object.entries(handles).map(([name, handle]) => {
        if ('foliaNativeDirectory' in handle && handle.foliaNativeDirectory === 1) {
            return [name, new NativeDirectoryHandle(handle.root, handle.path, handle.name, port) as unknown as FileSystemDirectoryHandle];
        }
        return [name, handle as FileSystemDirectoryHandle];
    }));
}
