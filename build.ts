import * as esbuild from 'esbuild'
import {run} from './runner'
async function f(){
  await esbuild.build({ 
    entryPoints: ['src/index.ts'],
    platform: 'node',
    bundle: true,
    outdir: './dist',
    sourcemap: true,
    target: 'node10',
    minifySyntax:false,
  })
} 
 
run({f,title:'build',watchfiles:['src','package.json','tsconfig.json']})
