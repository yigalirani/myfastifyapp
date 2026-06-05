import * as esbuild from 'esbuild'
void esbuild.build({ 
    entryPoints: ['src/index.ts','src/resend.ts'],
    platform: 'node',
    bundle: true,
    outdir: './dist', 
    sourcemap: true,
    target: 'node22',
    minifySyntax:false,
    external:["node:events"],
    format: 'esm',
  banner: {
        js: "import { createRequire } from 'node:module';const require = createRequire(import.meta.url);"
    }    
})
