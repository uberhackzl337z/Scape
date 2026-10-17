import ts from 'typescript';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
async function format(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const path=join(folder,entry.name);if(entry.isDirectory())await format(path);else if(path.endsWith('.ts')){const source=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true);await writeFile(path,printer.printFile(source));}}}
await format('src');
