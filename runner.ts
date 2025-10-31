
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
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
async function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
  const originalLog = console.log;
export async function run_func({f,filter,title,watchfiles=[]}:{
  f:()=>Promise<void>
  filter?:string
  title?:string
  watchfiles:string[]
}){
  let last_run=0
  let last_changed=0
  let filename_changed=''
  async function runit(reason:string){
    last_run=Date.now()
    console.log(`starting ${title||''} ${reason}`)
    const start=Date.now()
    try{

      await f()
      const end=Date.now()  
      const duration=(end-start)
      console.log(`done ${title||''} ${duration} ms`)
    }catch(ex){
     const end=Date.now()  
      const duration=(end-start)
      console.log(`failed ${title||''} ${duration} ms: ${String(ex)}`)      
    }
  }
  runit('initial')
  for (const filename of watchfiles){
    watch(filename,{},(eventType, filename) => {
      //console.log(`changed: ${filename} ,${eventType}`);
      last_changed=Date.now()
      if (filename!=null)
        filename_changed=filename
    })
  }
  while(true){
    if (last_changed>last_run){
      // oxlint-disable-next-line no-await-in-loop
      await runit(`file changed ${filename_changed}`) 
    }
    // oxlint-disable-next-line no-await-in-loop
    await sleep(1000)
  }
}
