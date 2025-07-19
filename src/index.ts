import Fastify,{FastifyInstance,} from 'fastify'
import {DB} from './autogen/database'
import * as utils from './utils'
import {print_body} from './render_page'
import { z } from "zod";
import { marked } from 'marked'
import fastifyStatic from '@fastify/static';
import { Kysely, MysqlDialect} from 'kysely'
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
async function toc_box_head(db:Kysely<DB>,post_id:number) { //starting with this post_id, build the toc, also get met
    const posts = await db.selectFrom('mc_post').orderBy('menu_order').selectAll().execute()
    const toc=utils.generate_toc({
      items:posts,  
      id_field:'ID',
      parent_id_field: 'post_parent',
      start_id:post_id
    })
    const meta_post_id=toc.parent_path[0].ID
    const meta=await db.selectFrom('mc_meta').where('meta_post_id','=',meta_post_id).selectAll().executeTakeFirst()
    return {meta,toc} 
}
async function build_server(app:FastifyInstance){
  const {connection}= utils.read_zod('./config.json',config_schema)
  const db=utils.mysql_pool<DB>(connection)
  app.register(fastifyStatic, {
    root: 'c:/yigal/mc2/images', // Root filesystem path
    prefix: '/', // URL prefix (optional)
    wildcard:false,
    extensions:['.css','.png']
  });
  app.get(
    '/*', async function handler (request, reply) {
    const path = (request.raw.url||'').replace(/^\//,'')
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
    const post=await db.selectFrom('mc_post').where('post_name','=',page).selectAll().executeTakeFirst()
    const content=await async function(){
      if (post==null)
        return print_body({body:'page not found'})
      const markdown=utils.textileToMarkdown(post.post_content)
      const body=await marked(markdown)
      const {meta,toc}=await toc_box_head(db,post.ID)

      return print_body({...post,body,meta})
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