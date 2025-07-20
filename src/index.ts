import Fastify,{FastifyInstance,} from 'fastify'
import {DB} from './autogen/database'
import * as utils from './utils'
import {print_body} from './render_page'
import { z } from "zod";
import { marked } from 'marked'
import fastifyStatic from '@fastify/static';
import { Kysely} from 'kysely'
//import { writeFile } from 'fs/promises';
const config_schema = z.object({
  connectionString: z.string(),
  connection:z.object({
    database: z.string(),
    host: z.string(),
    user: z.string(),
    password: z.string(),
    port: z.number(),
    connectionLimit: z.number()
  })
});

async function print_menu(db:Kysely<DB>) {
  const rows=await db.selectFrom('menu_view').selectAll().execute()
  return rows.map(({post_name,post_title,menu_script})=>{
    if (menu_script)
      return `<a href='/$g->php_dir/$script'>${post_title}</a>`
    return `<a href='/${post_name}.htm'>${post_title}</a>`
  }).join('\n')
}
async function make_cache(db:Kysely<DB>){ //todo: logic to refresh it when needed
  const posts=await db.selectFrom('mc_post').orderBy('menu_order').selectAll().execute()
  const posts_index=utils.index_array(posts,'post_name')
  return{
    posts,
    posts_index,
    menu:await print_menu(db),
    meta:utils.index_array(await db.selectFrom('mc_meta').selectAll().execute(),'meta_post_id')
  }
}
type Cache=Awaited<ReturnType<typeof make_cache>>
async function toc_box_head(cache:Cache,post_id:number) { //starting with this post_id, build the toc, also get met
    const toc=utils.generate_toc({
      items:cache.posts,  
      id_field:'ID',
      parent_id_field: 'post_parent',
      start_id:post_id,
      render_item({post_title,post_name}){
        return{
          title:post_title,
          href:`/${post_name}.htm`
        }
      }
    })
    const {toc_section}=toc
    const meta_post_id=toc.parent_path[0].ID
    const meta=cache.meta[meta_post_id]
    return {meta,toc_section} 
}


async function build_server(app:FastifyInstance){
  const {connection}= utils.read_zod('./config.json',config_schema)
  const db=utils.mysql_pool<DB>(connection)
  const cache:Cache=await make_cache(db)
  app.register(fastifyStatic, {
    root: 'c:/yigal/mc2/images', // Root filesystem path
    prefix: '/', // URL prefix (optional)
    wildcard:false,
    extensions:['.css','.png']
  });
  app.get(
    '/*', async function handler (request, reply) {
    const page=utils.calc_page(request,reply)   
    if (page==null) return 
    const post=cache.posts_index[page]
    const content=await async function(){
      if (post==null)
        return print_body({body:'page not found'})
      //writeFile('debug/textile.txt',post.post_content)
      const markdown=utils.textileToMarkdown(post.post_content)
      //writeFile('mark.md',markdown)
      const body=await marked(markdown)
      const {meta,toc_section}=await toc_box_head(cache,post.ID)
      
      return print_body({...post,body,meta,menu:cache.menu,toc_section})
    }()
    reply.type('text/html').send(content)
  })
}
async function bootstap(){
  const app = Fastify({logger: true})
  await build_server(app)
  app.listen({ port: 3000 })
}
bootstap()