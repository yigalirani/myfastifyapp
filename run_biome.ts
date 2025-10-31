import { spawn } from 'node:child_process';


const cmd = 'npx biome lint';
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
  process.stderr.write(data);
});

child.on('close', (code) => {
  const end=Date.now()
  const duration=(end-start)
  console.warn(`process exited with code ${code} ${duration} ms`);
});

