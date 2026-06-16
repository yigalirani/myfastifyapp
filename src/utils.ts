// oxlint-disable no-unsafe-call
// oxlint-disable no-unsafe-assignment
// oxlint-disable no-unsafe-member-access
import { TypeCompiler }                    from "@sinclair/typebox/compiler";
import type { TSchema, Static }            from "@sinclair/typebox";
import { readFileSync }                    from 'node:fs';
import { createPool,type PoolOptions }     from 'mysql2'
import { Kysely, MysqlDialect}             from 'kysely'
import type {FastifyReply, FastifyRequest} from 'fastify'
import * as crypto                         from "node:crypto";
import signature                           from "cookie-signature";
import { TransformDecodeCheckError }       from '@sinclair/typebox/value';

/*group of gerneric functions with understood input output that can be used in other programs with another databasre schems*/
/*export function get_elemnt<T extends Record<PropertyKey,any> >(a:T,field:keyof T){
  return a[field]
}*/
type Key=string|number
function is_key(a:unknown): a is Key{
  return typeof a==='string' || typeof a==='number'

}  

//type TOCField=string|number
/*interface TOCFields{
  id:TOCField
  parent_id:TOCField|undefined
}*/
interface TocItem< T,K extends keyof T >{ 
  data    : T
  children: TocItem<T, K>[]
  next    : TocItem<T, K>|undefined
};

export interface TOCConfig< T,K extends keyof T > {
  //get_fields: (a:T)=>TOCFields
  parent_id_key: K
  id_key       : K
  render_item  : (a:T)=>{title:string,href:string|undefined}
}
export function tag(content:string|undefined,tag:string){ //is usefull?
  if (content==null)
    return ''
  return `<${tag}>content</${tag}>`

}
function calc_first_non_folder< T,K extends keyof T >(item:TocItem<T,K>){
  const first_child=item.children[0]
  if (first_child==null)
    return item
  return calc_first_non_folder(first_child)
}
//type FlexRecord=Record<string, string|number>
//type Atom=string|number|boolean|null|undefined

export class IndexedChildren<T,K extends keyof T >{
  by_id
  enhanced_items //shoiuld this be a member? maybe better to oass to by_id and add_children
  constructor(
    public config:TOCConfig<T,K>,
    public items: T[]
  ){
    this.enhanced_items=items.map(this.make_item)
    this.by_id=this.make_index()
    this.add_children() 
  }
   
  make_item=(data:T)=>{
    //const fields=this.config.get_fields(data)
    const ans:TocItem<T,K>={
      data,
      children:[],
      next:undefined, 
      //...fields
    }
    return ans
  }
  make_index(){
    const ans:Map<Key,TocItem<T,K>>=new Map()
    for (const item of this.enhanced_items){
      const id=this.get_id(item)
      if (id!=null)
        ans.set(id,item)
    }
    return ans
  }
  get_parent(item:TocItem<T,K>|undefined){
    if (item==null)
      return
    const parent_id=item.data[this.config.parent_id_key] as unknown
    if (!is_key(parent_id))
      return
    //this.by_id type is  TOC<T extends Record<string, PropertyKey | null>>.by_id: Record<PropertyKey, TocItem<T>>
    const ans=this.by_id.get(parent_id)
    if (ans==null)//warning  Unnecessary conditional, the types have no overlap  @typescript-eslint/no-unnecessary-condition
      return
    return ans
  }    
  get_id(item:TocItem<T,K>){
   const ans=item.data[this.config.id_key] as unknown
    if (!is_key(ans))
      return 
    return ans
  }
  
  add_children(){
    for (const item of this.enhanced_items){
      /*if (item==null) //this is not needed because for of loop guarantee type non null
        continue*/
      const parent_item=this.get_parent(item)
      if (parent_item==null)
        continue
      parent_item.children.push(item)
    }
  }
  calc_parent_path(item:TocItem<T,K> | undefined){
    //const item=this.by_id[this.config.start_id]
    let cur_item=item
    const ans:TocItem<T,K>[]=[]
    while(cur_item!=null){
      ans.unshift(cur_item)
      cur_item=this.get_parent(cur_item)
    }
    return ans    
  }
}

export class TOC<T,K extends keyof T > {
  parent_path
  ans
  constructor(
    public index:IndexedChildren<T,K>,
    public start_id:Key
  ){
    const item=index.by_id.get(start_id)
    this.parent_path=index.calc_parent_path(item)
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
  calc_next(item:TocItem<T,K>|undefined,dpos:number,caption:string ):string|undefined{
    if (item==null)
      return
    const {index}=this
    const parent=index.get_parent(item)
    if (parent==null)//warning  Unnecessary conditional, the types have no overlap  @typescript-eslint/no-unnecessary-condition
      return
    const pos=parent.children.indexOf(item)
    const ans=parent.children[pos+dpos]
    if (ans!=null){
      const {title,href}=index.config.render_item(ans.data)
      return `<a href="${href}">${caption} - ${title}</a>`
    }
    return this.calc_next(parent,dpos,caption)
  } 
  render_toc(item:TocItem<T,K>,top:boolean):string{
    const folder=item.children.length>0
    if (top&&!folder)
      return ''
    const {index}=this    
    const {title,href}=index.config.render_item(item.data)
    const icon=folder?'folder':'page_text'
    const expand=top||this.parent_path.includes(item)

    const id=index.get_id(item)
    if (id==null)
      return ''


    const class_def=(id===this.start_id?'class=toc_box_selected':'')
    const first=calc_first_non_folder(item).data
    const first_render=index.config.render_item(first)    
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
  
}

/*
export function read_zod<T>(filename: string, schema: ZodType<T>): T {
  const config_data = readFileSync(filename, 'utf8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}*/

export function read_typebox<T extends TSchema>(filename: string, schema: T): Static<T> {
  try{
    const config_data = readFileSync(filename, "utf8");
    const compiler = TypeCompiler.Compile(schema);
    const parsed_json = JSON.parse(config_data)as unknown;
    const ans = compiler.Decode(parsed_json);
    return ans;
  }catch(ex){
    if (ex instanceof TransformDecodeCheckError){
      console.error("failed open config file,",filename,':',ex.error.message,ex.error.path)
      throw new Error('failed open config file',{ cause: ex })
    }    
    if (ex instanceof Error){
      console.error("failed open config file,",filename,":",ex.message)
    }
    throw new Error("failed open config file",{ cause: ex })
  }
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


export function calc_md5(input: string): string {
  return crypto.createHash("md5")
    .update(input, "utf8")
    .digest("hex");
}
export function calc_session_id(request:FastifyRequest,reply:FastifyReply,secret:string){
  const {session_id:exist}=request.cookies
  if (exist!=null){
    const unsigned=signature.unsign(exist, secret)
    if (unsigned!==false&&unsigned.length===32)
      return unsigned
  }
  const ans=calc_md5(crypto.randomUUID())
  const session_id=signature.sign(ans, secret)
  reply.setCookie('session_id', session_id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    signed: false,
  });
  return ans
}
interface FieldDef {
  name: string;
  type: string;
  title?: string;
  required:boolean
}
export function convert_schema(schema: TSchema): FieldDef[] {
  const { properties,required=[] } = schema;
  const ans: FieldDef[] = Object.entries(properties as object).map(([name, value]) => {
    const property_schema = value as TSchema;
    const { format, type: schema_type, title } = property_schema;
    const type = (format as string) || (schema_type as string);

    const field: FieldDef = { 
      name, 
      type,
      title, 
      required:(required as string[]).includes(name)
    };

    if (typeof title === 'string') {
      field.title = title;
    }

    return field;
  });

  return ans;
}


/*function gen_input(a:GenInput){
  const {title,name,data,errors,extra,type}=a
  const value=data?.[name]
  const error=errors?.[name]
  const value_attr=value==null?'':`value=${value}`
  const error_span=error==null?'':`<span id="id_${name}_error" class="error_msg" aria-live="assertive">${error}</span>`;
  return  `<div class=form_entry><label for="id_${name}">${title??name}:</label>
      <input 
        id="id_${name}"
        name="${name}"
        class="form_input"
        type="${type??'text'}" 
        required 
        ${extra}
        ${value_attr}
        aria-invalid="true"
        aria-describedby="id_${name}_error"
      >
       ${error_span}
       </div>
       `
}*/
export function make_html_form<T extends TSchema>(schema:T,html:string){
  const field_defs=convert_schema(schema)
  type DataType=Partial<Static<T>>
  /*type DataType = (T & {
    params: [];
})["static"] */
  return function(data?:DataType,errors?:DataType){
    function gen_input(a:FieldDef){
      const {title,name,type,required}=a
      const value=data?.[name as keyof DataType] /*Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.
  No index signature with a parameter of type 'string' was found on type '{}'.ts(7053) */
      const error=errors?.[name as keyof DataType]
  
      const value_attr=function(){
        if (value==null)
          return  ''
        return `value="${value.toString()}"`
      }()
      const error_tags=function(){
        if (error==null)
          return {
            span:'',
            aria_attribs:'',
          }
        return {
          span:`<span id="id_${name}_error" class="error_msg" aria-live="assertive">${error.toString()}</span>`,
          aria_attribs:`aria-invalid="true" aria-describedby="id_${name}_error"`
        }
      }()
      return  `<div class=form_entry><label for="id_${name}">${title??name}:</label>
          <input 
            id="id_${name}"
            name="${name}"
            class="form_input"
            type="${type}" 
            ${required?"required":''}
            ${value_attr}
            ${error_tags.aria_attribs}
            
          >
          ${error_tags.span}
          </div>
          `
    }

    const fragments=[]
    for (const field_def of field_defs){
      fragments.push(gen_input(field_def))
    }
    const joined=fragments.join('\n')
    const ans=html.replace('###',joined)
    return ans
  }
}


