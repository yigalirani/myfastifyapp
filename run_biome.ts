import {run} from './runner'
await run({f:'npx biome lint',watchfiles:['src','biome.json','package.json']})
