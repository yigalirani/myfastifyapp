import { spawn } from 'node:child_process';

function makeFilter() {
  let count = 0;
  return function (txt:string) {
    const lines = txt.split('\n').filter(x => x.includes('Linting code'));
    const ans = [];
    for (const line of lines) {
      count++;
      const filename = line.split('Linting code for ').at(-1);
      ans.push(`${count} ${filename}`);
    }
    return ans.join('\n');
  };
}

const filterit = makeFilter();

const timing = 'set TIMING=1&';
//const timing = '';
const cmd = timing + 'npx eslint . --debug --color ';
const start=Date.now()
const child = spawn(cmd, { shell: true });

child.stdout.on('data', (data) => {
  if (typeof data!=='string')
    return
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  if (typeof data!=='string')
    return  
  const filtered = filterit(data.toString());
  if (filtered) console.error(filtered);
});

child.on('close', (code) => {
  const end=Date.now()
  const duration=(end-start)
  console.warn(`process exited with code ${code} ${duration} ms`);
});

