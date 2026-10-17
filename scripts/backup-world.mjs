import { DatabaseSync, backup } from 'node:sqlite';
import { access, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
const data=resolve(process.env.DATA_DIR??'data'),source=join(data,'world.sqlite');
await access(source);
const directory=join(data,'backups');await mkdir(directory,{recursive:true});
const destination=join(directory,`world-${new Date().toISOString().replaceAll(':','-')}-${randomUUID().slice(0,8)}.sqlite`);
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,destination);console.log(`Consistent world backup: ${destination}`);}finally{db.close();}
