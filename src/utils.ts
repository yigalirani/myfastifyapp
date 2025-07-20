import { readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { ZodType } from "zod";
import { createPool,PoolOptions } from 'mysql2' 
import { Kysely, MysqlDialect} from 'kysely'
import {FastifyReply, FastifyRequest} from 'fastify'
/*group of gerneric functions with understood input output that can be used in other programs with another databasre schems*/
export function get_elemnt<T extends Record<PropertyKey,any> >(a:T,field:keyof T){
  return a[field]
}

export function index_array<T extends Record<string, any>, K extends keyof T>(
  items: T[],
  key: K
): Record<PropertyKey, T> {
  const ans:Record<PropertyKey, T>={}
  for (const item of items) {
    const keyValue = item[key];
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


export function generate_toc<T extends Record<string, any>>({items,id_field,parent_id_field,start_id,render_item}:{
  items: T[] //presorted by pos in patnet children order (in the db)
  id_field: keyof T
  parent_id_field: keyof T
  start_id: string | number
  render_item:(a:T)=>{title:string,href:string}
})/*: Toc<T>*/{
  const enhanced_items=items.map(make_item)
  const by_id=index_array(enhanced_items,id_field)
  for (const item of enhanced_items){
    const item_parent_id:PropertyKey=item[parent_id_field]
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
    cur_item=by_id[cur_item[parent_id_field]]
  }
  function calc_next(item:TocItem<T>,dpos:number,caption:string ){
    const parent_id=item[parent_id_field]
    const parent=by_id[parent_id]
    if (parent==null)
      return 
    // eslint-disable-next-line eqeqeq
    const pos=parent.children.findIndex(x=>x==item)
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
  const config_data = readFileSync(filename, 'utf-8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}
export function mysql_pool<T>(connection:PoolOptions){
  const dialect = new MysqlDialect({
    pool: createPool(connection)
  })
  const db = new Kysely<T>({dialect,log:['query']})
  return db
}

export function textileToMarkdown(textile: string): string { // https://claude.ai/public/artifacts/04904f93-eb57-442e-afb6-2f0354d1c679
  let markdown = textile;

  // Headers
  markdown = markdown.replace(/^h([1-6])\.\s+(.+)$/gm, (match, level, content) => {
    return '#'.repeat(parseInt(level)) + ' ' + content;
  });

  // Bold text
  markdown = markdown.replace(/\*([^*]+)\*/g, '**$1**');

  // Italic text - only convert underscores surrounded by whitespace or line boundaries
  markdown = markdown.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1*$2*$3');

  // Code spans
  markdown = markdown.replace(/@([^@]+)@/g, '`$1`');

  // Strike-through - only convert ASCII hyphen-minus (U+002D) surrounded by whitespace or line boundaries
  //markdown = markdown.replace(/(^|\s)\u002D([^\u002D]+)\u002D(\s|$)/g, '$1~~$2~~$3');

  // Links - stop at punctuation that's typically not part of URLs (but allow periods and common URL chars)

  markdown = markdown.replace(/"([^"]*)":([^\s|,]+)/gm, '[$1]($2)');


  // Images
  markdown = markdown.replace(/!([^!]+)!/g, '![]($1)');
  markdown = markdown.replace(/!([^!]+)\(([^)]+)\)!/g, '![$2]($1)');

  // Lists - unordered
  markdown = markdown.replace(/^\*\s+(.+)$/gm, '- $1');
  markdown = markdown.replace(/^\*{2}\s+(.+)$/gm, '  - $1');
  markdown = markdown.replace(/^\*{3}\s+(.+)$/gm, '    - $1');

  // Lists - ordered
  markdown = markdown.replace(/^#\s+(.+)$/gm, '1. $1');
  markdown = markdown.replace(/^#{2}\s+(.+)$/gm, '  1. $1');
  markdown = markdown.replace(/^#{3}\s+(.+)$/gm, '    1. $1');

  // Block quotes
  markdown = markdown.replace(/^bq\.\s+(.+)$/gm, '> $1');

  // Code blocks
  markdown = markdown.replace(/^bc\.\s*$/gm, '```');
  markdown = markdown.replace(/^bc\.\s+(.+)$/gm, '```\n$1\n```');

  // Preformatted text
  markdown = markdown.replace(/^pre\.\s+(.+)$/gm, '```\n$1\n```');

  // Tables - basic conversion
  markdown = markdown.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    return '| ' + cells.join(' | ') + ' |';
  });

  // Table headers (Textile |_. header |_. header | becomes Markdown header row)
  markdown = markdown.replace(/\|_\.\s*([^|]+)/g, '| $1');
  
  // Add table separator after first table row
  markdown = markdown.replace(/(^\|[^|]*\|.*$)/gm, (match, line) => {
    const cellCount = (line.match(/\|/g) || []).length - 1;
    const separator = '|' + ' --- |'.repeat(cellCount);
    return line + '\n' + separator;
  });



  return markdown;
}
export class Timer{
  start=performance.now()
  last=this.start
  enter(){
    this.start=performance.now()
    this.last=this.start
  }
  point(name:string){
    return
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