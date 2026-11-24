import {copyFile,mkdir,cp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
await mkdir(new URL('../public/readers/',import.meta.url),{recursive:true});
await copyFile(require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs'),new URL('../public/readers/pdf-6.4.299.worker.mjs',import.meta.url));
const packageRoot=dirname(require.resolve('pdfjs-dist/package.json'));
for(const folder of ['cmaps','standard_fonts','wasm']) await cp(join(packageRoot,folder),new URL('../public/readers/pdf-6.4.299/'+folder,import.meta.url),{recursive:true});
