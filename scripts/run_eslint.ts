import {run,eslint_linting_code} from '@yigal/watch_runner'
await run({
  cmd:'set timing=1&npx eslint . --debug --color ',
  watchfiles:[
    'src',
    'eslint.config.mjs',
    'scripts/build.ts',
    'package.json'
  ],
  filter:eslint_linting_code
})
