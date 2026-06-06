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
import {keyBy} from 'lodash-es';
import signature from "cookie-signature";

/*group of gerneric functions with understood input output that can be used in other programs with another databasre schems*/
/*export function get_elemnt<T extends Record<PropertyKey,any> >(a:T,field:keyof T){
  return a[field]
}*/



type TOCField=string|number
interface TOCFields{
  id:TOCField
  parent_id:TOCField|undefined
}
interface TocItem<T> extends TOCFields{ 
  data:T
  children: TocItem<T>[] 
  next:TocItem<T>|undefined
};

export interface TOCConfig<T> {
  get_fields: (a:T)=>TOCFields
  start_id:TOCField;
  render_item:(a:T)=>{title:string,href:string|undefined}  
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
  return calc_first_non_folder(first_child)
}
//type FlexRecord=Record<string, string|number>
//type Atom=string|number|boolean|null|undefined


export class TOC<T>{
  by_id
  enhanced_items
  parent_path
  ans
  constructor(
    public config:TOCConfig<T>,
    public items: T[]
  ){
    this.enhanced_items=items.map(this.make_item)
    this.by_id=keyBy(this.enhanced_items,'id')
    this.add_children() 
    const item=this.by_id[this.config.start_id]
    this.parent_path=this.calc_parent_path(item)
    const first_parent_path=this.parent_path[0]
    if (item==null || first_parent_path==null)
      return
    const toc_section=this.render_toc(first_parent_path,true)
    const next=this.calc_next(item,1,'Next')
    const last=this.calc_next(item,-1,'Last')
    this.ans={
      toc_section,
      next,
      last,
      parent_path:this.parent_path
    }
  }
  make_item=(data:T)=>{
    const fields=this.config.get_fields(data)
    const ans:TocItem<T>={
      data,
      children:[],
      next:undefined, 
      ...fields
    }
    return ans
  }
  calc_next(item:TocItem<T>|undefined,dpos:number,caption:string ):string|undefined{
    if (item==null)
      return
    const {parent_id}=item
    if (parent_id==null)
      return
    //this.by_id type is  TOC<T extends Record<string, PropertyKey | null>>.by_id: Record<PropertyKey, TocItem<T>>
    const parent=this.by_id[parent_id]
    if (parent==null)//warning  Unnecessary conditional, the types have no overlap  @typescript-eslint/no-unnecessary-condition
      return
    const pos=parent.children.indexOf(item)
    const ans=parent.children[pos+dpos]
    if (ans!=null){
      const {title,href}=this.config.render_item(ans.data)
      return `<a href="${href}">${caption} - ${title}</a>`
    }
    return this.calc_next(parent,dpos,caption)
  } 
  
  render_toc(item:TocItem<T>,top:boolean):string{
    const folder=item.children.length>0
    if (top&&!folder)
      return ''
    const {title,href}=this.config.render_item(item.data)
    const icon=folder?'folder':'page_text'
    const expand=top||this.parent_path.includes(item)
    const {id}=item
    const class_def=(id===this.config.start_id?'class=toc_box_selected':'')
    const first=calc_first_non_folder(item).data
    const first_render=this.config.render_item(first)    
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
      /*if (item==null) //this is not needed because for of loop guarantee type non null
        continue*/
      const {parent_id}=item
      if (parent_id==null)
        continue
      const parent_item=this.by_id[parent_id]
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
      const {parent_id}=cur_item
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
    const path = (req.raw.url??'').replace(/^\//,'')   
    const page=function(){
      if (path==='')
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
export async function register_session_hook(app:FastifyInstance){
  await app.register(cookie, {
    parseOptions: {}, // cookie.parse options
  });  
  app.addHook('onRequest', (request, reply,done) => {
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
    done()
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
  secret: z.string(),
  salt:z.string(),
  peper:z.string()
})
export function calc_session_id(request:FastifyRequest,reply:FastifyReply,secret:string){
  const {session_id:exist}=request.cookies
  if (exist!=null){
    const unsigned=signature.unsign(exist, secret)
    if (unsigned!==false)
      return unsigned
  }
  const ans=crypto.randomUUID()
  const session_id=signature.sign(ans, secret)
  reply.setCookie('session_id', session_id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    signed: false,
  });
  return ans
}