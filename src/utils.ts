// oxlint-disable no-unsafe-call
// oxlint-disable no-unsafe-assignment
// oxlint-disable no-unsafe-member-access

import { readFileSync } from 'node:fs';
//import { writeFile } from 'fs/promises';
import  { type ZodType,z } from "zod";
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
  const first_child=item.children[0]
  if (first_child==null)
    return item
  return calc_first_non_folder(item)
}
export interface TOCConfig<T extends Record<string, PropertyKey|null> > {
  id_field: keyof T
  parent_id_field: keyof T
  start_id:string|number;
  render_item:(a:T)=>{title:string,href:string}  
}
export class TOC<T extends Record<string, PropertyKey|null> > {
  by_id
  enhanced_items
  parent_path
  toc_section
  next
  last
  constructor(
    public config:TOCConfig<T>,
    public items: T[]
  ){
    this.enhanced_items=items.map(make_item)
    this.by_id=index_array(this.enhanced_items,this.config.id_field)   
    this.add_children() 
    const item=this.by_id[this.config.start_id]
    this.parent_path=this.calc_parent_path(item)
    const first_parent_path=this.parent_path[0]
    if (item==null || first_parent_path==null)
      return
    this.toc_section=this.render_toc(first_parent_path,true)
    this.next=this.calc_next(item,1,'Next')
    this.last=this.calc_next(item,-1,'Last')
  }
  
  calc_next(item:TocItem<T>|undefined,dpos:number,caption:string ):string|undefined{
    if (item==null)
      return
    const parent_id=item[this.config.parent_id_field]
    if (parent_id==null)
      return
    const parent=this.by_id[parent_id]
    if (parent==null)
      return 
    const pos=parent.children.indexOf(item)
    const ans=parent.children[pos+dpos]
    if (ans!=null){
      const {title,href}=this.config.render_item(ans)
      return `<a href="${href}">${caption} - ${title}</a>`
    }
    return this.calc_next(parent,dpos,caption)
  } 
  
  render_toc(item:TocItem<T>,top:boolean):string{
    const folder=item.children.length>0
    if (top&&!folder)
      return ''
    const {title,href}=this.config.render_item(item)
    const icon=folder?'folder':'page_text'
    const expand=top||this.parent_path.includes(item)
    const item_id_field=item[this.config.id_field]
    const class_def=(item_id_field===this.config.start_id?'class=toc_box_selected':'')
    const first_render=this.config.render_item(calc_first_non_folder(item))    
    if (!expand||!folder)
      return `<li><a ${class_def} href="${first_render.href}"><img src="/${icon}.gif">${title}</a></li>`
    const children=item.children.map(x=>this.render_toc(x,false)).join('\n')
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
  add_children(){
    for (const item of this.enhanced_items){
      if (item==null)
        continue
      const item_parent_id=item.parent_id_field
      if (item_parent_id==null)
        continue
      const parent_item=this.by_id[item_parent_id]
      if (parent_item==null)
        continue
      parent_item.children.push(item)
    }
  }
  calc_parent_path(item:TocItem<T> | undefined){
    //const item=this.by_id[this.config.start_id]
    let cur_item=item
    const ans:TocItem<T>[]=[]
    while(cur_item!=null){
      ans.unshift(cur_item)
      const parent_id=cur_item[this.config.parent_id_field]
      if (parent_id==null)
        break
      cur_item=this.by_id[parent_id]
    }
    return ans    
  }
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
  app.addHook('onRequest',  (request, reply) => {
    let {session_id} = request.cookies;
    if (session_id==null) {
      session_id = randomUUID();
      reply.setCookie('session_id', session_id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        signed: false,
      });
    }
    return
  })
}

export const config_schema = z.object({
  connectionString: z.string(),
  connection:z.object({
    database: z.string(),
    host: z.string(),
    user: z.string(),
    password: z.string(),
    port: z.number(),
    connectionLimit: z.number(),
  }),
  salt:z.string(),
  peper:z.string()
})