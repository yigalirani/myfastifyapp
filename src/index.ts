import Fastify,{FastifyRequest, type FastifyInstance, type FastifyReply} from 'fastify'
import type {DB,McPost} from './autogen/database.js'
import * as utils from './utils.js'
import * as textile from './textile.js'
import { randomUUID } from 'node:crypto';
import {print_body} from './render_page.js'
import {keyBy} from 'lodash-es';
import { marked } from 'marked'
import fastify_static from '@fastify/static';
import type { Kysely,Selectable} from 'kysely'
import signature from "cookie-signature";
//import { writeFile } from 'fs/promises';


async function print_menu(db:Kysely<DB>) {
  const rows=await db.selectFrom('menu_view').selectAll().execute()
  return rows.map(({post_name,post_title,menu_script})=>{
    if (menu_script!=null)
      return `<a href='/buy'>${post_title}</a>`
    return `<a href='/${post_name}.htm'>${post_title}</a>`
  }).join('\n')
}
async function make_cache(db:Kysely<DB>){ //todo: logic to refresh it when needed
  const posts:Selectable<McPost>[]=await db.selectFrom('mc_post').orderBy('menu_order').selectAll().execute()
  const posts_index=keyBy(posts,'post_name')
  return{
    posts,
    posts_index,
    menu:await print_menu(db),
    meta:keyBy(await db.selectFrom('mc_meta').selectAll().execute(),'meta_post_id')
  }
}
type Cache=Awaited<ReturnType<typeof make_cache>>
function toc_box_head(cache:Cache,post_id:number) { //starting with this post_id, build the toc, also get met
    const toc=new utils.TOC({
        get_fields(a:Selectable<McPost>){
          return{
            id:a.ID,
            parent_id:a.post_parent
          }
        },
        start_id:post_id,
        render_item(data:Selectable<McPost>){
          const {post_title,post_name}=data
          return{
            title:post_title,
            href:`/${post_name}.htm`
          }
        }
      },
      cache.posts  
    ).ans
    const meta=function(){
      const meta_post_id=toc?.parent_path[0]?.data.ID
      if (meta_post_id==null)
        return
      return cache.meta[meta_post_id]
    }()
    if (meta==null)
      return toc
    return {meta,...toc} 
}
/*
function  print_comment_form(){
    print("<div class=comment_line></div>");
  if ($g->user){
      $g->id_counter++;
      print "<div><a href='#' onclick='return toggle(\"r$g->id_counter\");'> Add Comment</a></div>";
      print_comment_form2();
  }
  else
      print "<a href='/$g->php_dir/user.php?action=login'>Login to post comments</a><br>";
}
function print_comments(){
    print_comment_form();
    $q=get_comment_query();
    $comments=mc_query_all ($q,"comment_id");
     add_children($comments,'comment_parent_id','comment_id');
     foreach($comments as $comment){
         if ($comment['comment_parent_id'])
             break;
         print_comment($comments,$comment,0);
     }
}*/
interface Connection{
  session_id:string
}
async function connect(request:FastifyRequest, reply:FastifyReply):Connection{
  const secret='dfdf'
  const session_id=function(){
    const {session_id:exist}=request.cookies
    if (exist!=null && signature.unsign(exist, secret)==exist)
      return exist
    const ans=signature.sign(crypto.randomUUID(), secret)
    reply.setCookie('session_id', ans, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      signed: false,
    });
    return ans
  }()
  return {session_id}
}
async function build_server(app:FastifyInstance){
  const {config_schema}=utils
  const {connection}= utils.read_zod('./config.json',config_schema)
  const db=utils.mysql_pool<DB>(connection)
  const cache:Cache=await make_cache(db)
  //await utils.register_session_hook(app)
  function send_body(a:Parameters<typeof print_body>[0],reply:FastifyReply){
    reply.type('text/html').send(print_body({...a,menu:cache.menu}))
  }  
  app.register(fastify_static, {
    root: 'c:/yigal/mc2/images', // Root filesystem path
    prefix: '/', // URL prefix (optional)
    wildcard:false,
    extensions:['.css','.png']
  });
  app.get('/login',(req,reply)=>
    send_body({body:'todo: print login'},reply)
  )

  app.get(
    '/*', async  (request, reply)=> {
    const page=utils.calc_page(request,reply)   
    if (page==null) return 
    const post=cache.posts_index[page]
    if (post==null)
      return send_body({body:'page not found'},reply)
    //writeFile('debug/textile.txt',post.post_content)
    const markdown=textile.textileToMarkdown(post.post_content||'')
    //writeFile('mark.md',markdown)
    const body=await marked(markdown)
    const toc= toc_box_head(cache,post.ID)
    send_body({...post,body,...toc},reply)
  })


/*app.get('/', (req, res) => {
  res.send('Server is responding');
});
 */ 
}
async function bootstap(){
  const app = Fastify({logger: true})
  await build_server(app)
  await app.listen({ port: 81 })
}
await bootstap()