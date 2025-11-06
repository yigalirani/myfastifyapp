import {run} from '@yigal/watch_runner'
await run({
  cmd:'npx oxlint --type-aware',
  watchfiles:[
    'src',
    '.oxlintrc.json',
    'package.json'
  ]
})
