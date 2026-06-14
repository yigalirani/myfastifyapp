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
interface IndexDef<T,K extends keyof T >{
  items:Array<T>,
  parent_id_field:K,
  id_field:K
  selected_id:Key
  render:(parent:T,first_child?:T)=>string
}
function calc_parent_set<T,K extends keyof T >(p:IndexDef<T,K>,by_id:Record<Key,T>){// calc_parent_set(){ //probably from the selected item to the root
  //const item=this.by_id[this.config.start_id]
  const {selected_id,id_field,parent_id_field}=p
  let cur_item=by_id[selected_id]
  const ans=new Set<Key>()
  while(cur_item!=null){
    const id=cur_item[id_field]
    if (!is_key(id))
      break
    ans.add(id)
    const parent_id=cur_item[parent_id_field]
    if (!is_key(parent_id))
      break
    cur_item=by_id[parent_id]
  }
  return ans    
}
interface TreeIndex< T,K extends keyof T >{
  by_id: Record<Key, T>;
  parent_set: Set<Key>;
  children_index: {
      map: Record<Key, T[]>;
      root: T | undefined;
  };
}
export function index_tree< T,K extends keyof T >(p:IndexDef<T,K>):TreeIndex<T,K>{
    const {items,parent_id_field,id_field,selected_id}=p
    const by_id=index_array(items,id_field)
    const parent_set=function(){
      let cur_item=by_id[selected_id]
      const ans=new Set<Key>()
      while(cur_item!=null){
        const id=cur_item[id_field]
        if (!is_key(id))
          break
        ans.add(id)
        const parent_id=cur_item[parent_id_field]
        if (!is_key(parent_id))
          break
        cur_item=by_id[parent_id]
      }
      return ans          
    }()
  
    const children_index=function(){
      const map:Record<Key,T[]>={}
      for (const item of items){
        const parent_id=item[parent_id_field]
        if (is_key(parent_id))
          default_get(map,parent_id,()=>[]).push(item)
      }
      return map
  }()
  return {by_id,children_index}
}
function is_key(a:unknown): a is Key{
  return typeof a==='string' || typeof a==='number'

}  
function find_next< T,K extends keyof T >(p:IndexDef<T,K>,index:TreeIndex<T,K>,item:T,dpos:number ):T|undefined{
  const {by_id,children_index}=index
  const {parent_id_field}=p
  function f(item:T,dpos:number){
    const parent_id=item[parent_id_field] as unknown //without this case the typ of key after the type guards is sonething more complex that i need. 
    if (!is_key(parent_id))
      return
    const parent=by_id[parent_id]
    if (parent==null)
      return
    const children=children_index[parent_id]
    if (children==null)
      return
    const pos=children.indexOf(item)
    const ans=children[pos+dpos]
    if (ans!=null)
      return ans
    return f(parent,dpos)
  }
  return f(item,dpos)
}

export function tag(content:string|undefined,tag:string){ //is usefull?
  if (content==null)
    return ''
  return `<${tag}>content</${tag}>`

}
/*function calc_first_non_folder< T,K extends keyof T >(item:T){
  const first_child=item.children[0]
  if (first_child==null)
    return item
  return calc_first_non_folder(first_child)
}*/
interface ItemEx<T>{
  item:T
  parent_path:Array<T>
}
export function index_array<T,K extends keyof T >(
  items: T[],
  key: K
): Record<Key,T> {
  const ans:Record<Key,T>={}
  for (const item of items) {
    const value = item[key];
    if (value == null) continue;
    if (is_key(value)){
      ans[value] = item;
    } // should warn of by type? probably not
  }
  return ans;
}
export function default_get<T>(obj:Record<Key,T>,k:Key,maker:()=>T){
  const exists=obj[k]
  if (exists!=null)
    return exists
  const ans=maker() 
  obj[k]=ans
  return ans
}
export function map_default_get<T>(map:Map<Key,T>,k:Key,maker:()=>T){
  const exists=map.get(k)
  if (exists!=null)
    return exists
  const ans=maker() 
  map.set(k,ans)
  return ans
}
export function render_toc< T,K extends keyof T >(p:IndexDef<T,K>){
  const {id_field,selected_id,render}=p
  const index=index_tree(p)
  const {children_index,by_id}=index
  function f(node:T):string{
    const id=node[id_field]
    const selected_attr=(selected_id==id)?'class=selected':''
    const lone_ans= `<li ${selected_attr}> ${render(node)} </li>`
    if (!is_key(id) || !parent_set.has(id) )
      return lone_ans
    const node_children=map[id]
    if (node_children==null||node_children.length===0)
      return lone_ans
    const children_html=node_children.map(f).join('\n')
    return `<li>${render(node,node_children[0])}<ul>${children_html}</ul></li>`
  }
  if (root==null)
    return 'root not found' //todo: too cryptic
  return  f(root)
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


