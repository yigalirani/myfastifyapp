// oxlint-disable no-unsafe-call
// oxlint-disable no-unsafe-assignment
// oxlint-disable no-unsafe-member-access

import { readFileSync } from 'node:fs';
//import { writeFile } from 'fs/promises';
import type { ZodType } from "zod";
import { createPool,type PoolOptions } from 'mysql2' 
import { Kysely, MysqlDialect} from 'kysely'
import type {FastifyReply, FastifyRequest,FastifyInstance} from 'fastify'
import cookie from '@fastify/cookie';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    session_id?: string;
  }
}
/*group of gerneric functions with understood input output that can be used in other programs with another databasre schems*/
/*export function get_elemnt<T extends Record<PropertyKey,any> >(a:T,field:keyof T){
  return a[field]
}*/

export function index_array<T extends Record<string, PropertyKey|null>, K extends keyof T>(
  items: T[],
  key: K
): Record<PropertyKey, T> {
  const ans:Record<PropertyKey, T>={}
  for (const item of items) {
    const keyValue = item[key];
    if (keyValue == null) continue;
    ans[keyValue] = item;
  }
  return ans;
}

type TocItem<T> = T & { 
  children: TocItem<T>[] 
  next:TocItem<T>|undefined
};
function make_item<T>(a:T):TocItem<T>{
  return {...a,children:[],next:undefined}
}

export function tag(content:string|undefined,tag:string){ //is usefull?
  if (content==null)
    return ''
  return `<${tag}>content</${tag}>`

}
function calc_first_non_folder<T>(item:TocItem<T>){
  if (item.children.length===0)
    return item
  return calc_first_non_folder(item.children[0])
}


export function generate_toc<T extends Record<string, PropertyKey|null>>({items,id_field,parent_id_field,start_id,render_item}:{
  items: T[] //presorted by pos in patnet children order (in the db)
  id_field: keyof T
  parent_id_field: keyof T
  start_id: string | number
  render_item:(a:T)=>{title:string,href:string}
})/*: Toc<T>*/{
  const enhanced_items=items.map(make_item)
  const by_id=index_array(enhanced_items,id_field)
  for (const item of enhanced_items){
    if (item==null)
      continue
    const item_parent_id=item.parent_id_field
    if (item_parent_id==null)
      continue
    const parent_item=by_id[item_parent_id]
    if (parent_item==null)
      continue
    parent_item.children.push(item)
  }
  const item=by_id[start_id]
  let cur_item=item
  const parent_path:TocItem<T>[]=[]
  while(cur_item!=null){
    parent_path.unshift(cur_item)
    const parent_id=cur_item[parent_id_field]
    if (parent_id==null)
      break
    cur_item=by_id[parent_id]
  }
  function calc_next(item:TocItem<T>,dpos:number,caption:string ){
    const parent_id=item[parent_id_field]
    if (parent_id==null)
      return
    const parent=by_id[parent_id]
    if (parent==null)
      return 
    // eslint-disable-next-line eqeqeq
    const pos=parent.children.indexOf(item)
    const ans=parent.children[pos+dpos]
    if (ans!=null){
      const {title,href}=render_item(ans)
      return `<a href="${href}">${caption} - ${title}</a>`
    }
    return calc_next(parent,dpos,caption)
  }  
  
  function render_toc(item:TocItem<T>,top:boolean):string{
    const folder=item.children.length>0
    if (top&&!folder)
      return ''
    const {title,href}=render_item(item)
    const icon=folder?'folder':'page_text'
    const expand=top||parent_path.includes(item)
    const item_id_field=item[id_field]
    const class_def=(item_id_field===start_id?'class=toc_box_selected':'')
    const first_render=render_item(calc_first_non_folder(item))    
    if (!expand||!folder)
      return `<li><a ${class_def} href="${first_render.href}"><img src="/${icon}.gif">${title}</a></li>`
    const children=item.children.map(x=>render_toc(x,false)).join('\n')
    const ul= `<ul>${children}</ul>`

    if (top)
      return `<h3><a href="${href}">${title}</a></h3>${ul}`
    return `<li><a href="${first_render.href}"><img src="/${icon}.gif">${title}</a>${ul}</li>`
    /*for (const parent of parent_path){
    const selected=parent_path.at(-1)
    if (selected==null)
      return ''
    const {title,href}=render_item(selected)
    return `<h3><a class='toc_box_selected' href='${href}'>${title}</a></h3>`*/
  }
  const toc_section=render_toc(parent_path[0],true)
  const next=calc_next(item,1,'Next')
  const last=calc_next(item,-1,'Last')
  return {toc:by_id,parent_path,toc_section,next,last}
}


export function read_zod<T>(filename: string, schema: ZodType<T>): T {
  const config_data = readFileSync(filename, 'utf8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}
export function mysql_pool<T>(connection:PoolOptions){
  const dialect = new MysqlDialect({
    pool: createPool(connection)
  })
  const db = new Kysely<T>({dialect,log:['query']})
  return db
}

export class Timer{
  start=performance.now()
  last=this.start
  enter(){
    this.start=performance.now()
    this.last=this.start
  }
  point(name:string){
    const now=performance.now()
    console.log(`${name} ${now-this.start} ${now-this.last}`)
    this.last=now
  }
}


export function calc_page(req:FastifyRequest,reply:FastifyReply){
  //todo: this is not generic enouth. add config here for default page name and extension
    const path = (req.raw.url||'').replace(/^\//,'')   
    const page=function(){
      if (path==null||path==='')
        return 'index'
      if (!path.endsWith('.htm')){ //routing syntax not smart enough to do it
        return
      }
      return path.slice(0,-4)
    }()
    if (page==null){
        reply.callNotFound();
        return
    }
    return page
  }
export function register_session_hook(app:FastifyInstance){
  app.register(cookie, {
    parseOptions: {}, // cookie.parse options
  });  
  app.addHook('onRequest', async (request, reply) => {
    let {session_id} = request.cookies;
    if (!session_id) {
      session_id = randomUUID();
      reply.setCookie('session_id', session_id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        signed: false,
      });
    }
  })
}