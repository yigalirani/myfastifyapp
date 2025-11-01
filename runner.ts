
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
type FilterFunc=(line:string)=>string|true|false //string-show just the string  +line number, true show as is, false dont show
/*

*/
export const eslint_linting_code:FilterFunc=(line:string)=>{
  if (line.split(' eslintrc:').length>1)
    return false
  const split=line.split(' eslint:')[1]//Linting code for ');
  if (split==null)
    return true
  const split2=split.split('Linting code for ')[1]
  if (split2==null)
    return false
  return split2
}
function make_filter_stream(filter:FilterFunc){
  let last_line=''
  let count=0
  function print_filtered(line:string){
    const filtered=filter(line)
    if (filtered===false)
      return 
    if (filtered===true){
      console.log(line)
      return 
    }
    console.log(count++,filtered)
  }
  return {
    write(a:string){
      const total_text=last_line+a
      const lines=total_text.split('\n')
      for (const  line of lines.slice(0,-1))
        print_filtered(line)
    
      last_line=lines.at(-1)||''
    },
    flush(){
        print_filtered(last_line)
    }
  }
}
async function run_cmd({
  cmd,
  filter=(_a:string)=>true,
}: {
  cmd: string;
  filter?: FilterFunc;
}) {
  const filter_stream=make_filter_stream(filter)
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, {
      shell: true,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.stdout.on("data", (data) => {
      filter_stream.write(String(data))
    });

    child.stderr.on("data", (data) => {
      filter_stream.write(String(data))
    });

    child.on("close", (code) => {
      filter_stream.flush()
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
  filter?:FilterFunc
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
  await runit('initial')
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
