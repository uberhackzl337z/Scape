import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeAtomic } from './save-file.js';
// One authoritative process owns this world. Economy + escrow commit together.
export class WorldStore {
    private db?: DatabaseSync;
    private writerLock?: DatabaseSync;
    constructor(readonly directory: string, readonly mode: 'json' | 'sqlite', readonly worldId: string) { }
    async open() {
        await mkdir(this.directory, { recursive: true });
        if (this.mode === 'sqlite') {
            // Hold an OS-backed SQLite lock in a separate file, so a second
            // simulation cannot overwrite this world's snapshots. Crash releases it.
            this.writerLock = new DatabaseSync(join(this.directory, 'world-lock.sqlite'));
            try {
                this.writerLock.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS writer_lock (id INTEGER);');
            }
            catch (error) {
                this.writerLock.close();
                this.writerLock = undefined;
                throw new Error('Another server already owns this world directory.', { cause: error });
            }
            this.db = new DatabaseSync(join(this.directory, 'world.sqlite'));
            this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS world_state (id INTEGER PRIMARY KEY CHECK(id=1), world_id TEXT NOT NULL,
          revision INTEGER NOT NULL, saved_at INTEGER NOT NULL, payload TEXT NOT NULL);`);
            const row = this.db.prepare('SELECT world_id, payload FROM world_state WHERE id=1').get();
            if (row) {
                if (row.world_id !== this.worldId)
                    throw new Error('Database belongs to a different WORLD_ID');
                return JSON.parse(String(row.payload)) as unknown;
            }
        }
        // Import existing JSON only when creating a new SQLite world; never overwrite it.
        try {
            return JSON.parse(await readFile(join(this.directory, 'profiles.json'), 'utf8')) as unknown;
        }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                return undefined;
            throw error;
        }
    }
    async write(payload: string) {
        if (!this.db) {
            if (this.mode !== 'json')
                throw new Error('World store is not open');
            return writeAtomic(join(this.directory, 'profiles.json'), payload);
        }
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.prepare(`INSERT INTO world_state (id,world_id,revision,saved_at,payload) VALUES (1,?,1,?,?)
        ON CONFLICT(id) DO UPDATE SET revision=revision+1,saved_at=excluded.saved_at,payload=excluded.payload`)
                .run(this.worldId, Date.now(), payload);
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
    close() { this.db?.close(); this.db = undefined; this.writerLock?.close(); this.writerLock = undefined; }
}
