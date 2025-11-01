import {run} from './runner.ts'
await run({f:'npx biome lint',watchfiles:['src','biome.json','package.json']})
