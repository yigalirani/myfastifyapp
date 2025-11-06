import {run} from '@yigal/watch_runner'
await run({
  cmd:'npx biome lint',
  watchfiles:[
    'src',
    'biome.json',
    'package.json'
  ]
})
