export function serverConfig(env: NodeJS.ProcessEnv) {
    const production = env.APP_ENV === 'production';
    const host = env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
    const port = Number(env.PORT ?? 3000), capacity = Number(env.MAX_PLAYERS ?? 16);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error('Invalid PORT');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200)
        throw new Error('Invalid MAX_PLAYERS');
    const storage = env.STORAGE ?? 'sqlite';
    if (storage !== 'sqlite' && storage !== 'json')
        throw new Error('STORAGE must be sqlite or json');
    let origin: string | undefined;
    if (env.PUBLIC_ORIGIN) {
        const u = new URL(env.PUBLIC_ORIGIN);
        if (u.username || u.password || u.pathname !== '/' || u.search || u.hash || !['https:', 'http:'].includes(u.protocol))
            throw new Error('PUBLIC_ORIGIN must be an origin without credentials, path or query');
        if (production && u.protocol !== 'https:')
            throw new Error('Production requires an HTTPS PUBLIC_ORIGIN');
        origin = u.origin;
    }
    if (production && (!origin || storage !== 'sqlite'))
        throw new Error('Production requires PUBLIC_ORIGIN and SQLite storage');
    const worldId = env.WORLD_ID ?? 'the-crossing';
    if (!/^[a-z0-9-]{1,48}$/.test(worldId))
        throw new Error('Invalid WORLD_ID');
    return { production, host, port, capacity, storage: storage as 'json' | 'sqlite', origin, worldId,
        worldName: (env.WORLD_NAME ?? 'Scape').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 40) || 'Scape' };
}
export function validOrigin(origin: unknown, host: unknown, publicOrigin?: string) {
    if (typeof origin !== 'string')
        return false;
    try {
        const u = new URL(origin);
        return origin === u.origin && ['http:', 'https:'].includes(u.protocol)
            && (publicOrigin ? origin === publicOrigin : u.host === host);
    }
    catch {
        return false;
    }
}
