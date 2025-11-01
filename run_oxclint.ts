import {run} from './runner'
await run({f:'npx oxlint --type-aware',watchfiles:['src','.oxlintrc.json','package.json']})
