import {run} from './runner.ts'
await run({f:'npx oxlint --type-aware',watchfiles:['src','.oxlintrc.json','package.json']})
