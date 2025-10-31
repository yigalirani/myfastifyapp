import * as esbuild from 'esbuild'
import {run_func} from './runner.ts'
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
 
run_func({f,title:'build',watchfiles:['src']})
