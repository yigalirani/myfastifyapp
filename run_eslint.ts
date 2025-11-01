import {run,eslint_linting_code} from './runner.ts'
await run({
  f:'set timing=1&npx eslint . --debug --color ',
  watchfiles:['src','eslint.config.mjs','build.ts','package.json'],
  filter:eslint_linting_code
})
