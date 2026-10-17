import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
// OneDrive/antivirus can briefly hold the destination open on Windows.
// Retry replacement; never truncate the last committed save as a fallback.
export async function writeAtomic(path: string, data: string) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path + '.tmp', data);
    for (let attempt = 0;; attempt++) {
        try {
            await rename(path + '.tmp', path);
            return;
        }
        catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (attempt >= 6 || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? ''))
                throw error;
            await new Promise(r => setTimeout(r, 100 * 2 ** attempt));
        }
    }
}
