
import { spawn } from 'node:child_process';
export function run(cmd:string,filter:string){
  console.log(cmd)
  const start=Date.now()
  const child = spawn(cmd, { shell: true,env: { ...process.env, FORCE_COLOR: '1' }, });

  child.stdout.on('data', (data) => {
      process.stderr.write(data instanceof Uint8Array?data:String(data));
  });

  child.stderr.on('data', (data) => {
      process.stderr.write(data instanceof Uint8Array?data:String(data));
  });

  child.on('close', (code) => {
    const end=Date.now()
    const duration=(end-start)
    console.warn(`process exited with code ${code} ${duration} ms`);
  });
}
export async function run_func({f,filter,title}:{
  f:()=>Promise<void>
  filter?:string
  title?:string
}){
  console.log(`starting ${title||''}`)
  
  const start=Date.now()
  await f()
  const end=Date.now()  
  const duration=(end-start)
  console.log(`done ${title||''} ${duration} ms`)
}
