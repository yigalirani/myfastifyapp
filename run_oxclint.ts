import {run} from './runner.ts'
await run({f:'oxlint --type-aware',watchfiles:['src','.oxlintrc.json','package.json']})
