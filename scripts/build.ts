import * as esbuild from 'esbuild'
import {run} from '@yigal/watch_runner'
async function cmd(){
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
 
await run({
  cmd,
  title:'build',
  watchfiles:[
    'src',
    'package.json',
    'tsconfig.json'
  ]
})
