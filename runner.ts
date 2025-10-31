
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
async function run_cmd({
  cmd,
  filter,
}: {
  cmd: string;
  filter?: string;
}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, {
      shell: true,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.stdout.on("data", (data) => {
      const output = String(data)
      if (!filter || output.includes(filter)) {
        process.stderr.write(output);
      }
    });

    child.stderr.on("data", (data) => {
      const output = String(data)
      if (!filter || output.includes(filter)) {
        process.stderr.write(output);
      }
    });

    child.on("close", (code) => {
      console.warn(`process exited with code ${code}`);
      resolve(null);
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}
async function sleep(ms:number) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}
export async function run({f,title,watchfiles=[],filter}:{
  f:string|(()=>Promise<void>)
  title?:string
  watchfiles?:string[]
  filter?:string
}){
  const effective_title=(typeof f==='string'?f:title)
  let last_run=0
  let last_changed=0
  let filename_changed=''
  async function runit(reason:string){
    last_run=Date.now()
    console.log(`starting ${effective_title||''} ${reason}`)
    const start=Date.now()
    try{
      if (typeof f==='string')
        await run_cmd({cmd:f,filter})
      else
        await f()
      const end=Date.now()  
      const duration=(end-start)
      console.log(`done ${effective_title||''} ${duration} ms`)
    }catch(ex){
     const end=Date.now()  
      const duration=(end-start)
      console.log(`failed ${effective_title||''} ${duration} ms: ${String(ex)}`)      
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
