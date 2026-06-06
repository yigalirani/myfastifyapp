import Fastify,{type FastifyRequest,type RouteHandlerMethod , type FastifyInstance, type FastifyReply,type onRequestHookHandler} from 'fastify'
import type {DB,McPost} from './autogen/database.js'
import * as utils from './utils.js'
import * as textile from './textile.js'

import {print_body} from './render_page.js'
import {keyBy} from 'lodash-es';
import { marked } from 'marked'
import fastify_static from '@fastify/static';
import type { Kysely,Selectable} from 'kysely'

import cookie from '@fastify/cookie';
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


type CacheType=Awaited<ReturnType<typeof make_cache>>
interface State{
  session_id:string
  cache:CacheType
}
declare module 'fastify' {
  interface FastifyRequest {
    state: State;
  }
}
class MyServer{
  config_schema=utils.config_schema
  config
  db
  cache:CacheType|undefined

  constructor(public app:FastifyInstance){
    this.config=utils.read_zod('./config.json',this.config_schema)
    this.db=utils.mysql_pool<DB>(this.config.connection) 
    this.register_static() 
      this.app.register(cookie, {
      parseOptions: {}, // cookie.parse options
    });    
    app.addHook('onRequest',this.on_request)
    app.get('/login',(req,reply)=>
      this.send_body({body:'todo: print login'},reply)
    )    
    app.get('/*',this.send_page)
  }
  make_state(request:FastifyRequest, reply:FastifyReply){
    const {secret}=this.config

    const cache=this.get_cache()

    const session_id=utils.calc_session_id(request, reply,secret)
    const ans:State= {session_id,cache}
    return ans
  }  
  on_request:onRequestHookHandler=(request,reply,done)=>{
    const {cookies}=request
    if (cookies==null){
      console.log('console in null')
    }    
    request.state=this.make_state(request,reply)
    done()
  }
  
  async start(){
    this.cache=await make_cache(this.db)   

  }
  get_cache(){
    if (this.cache)
      return this.cache
    throw new Error("server not ready yet, try again later")
  }
  send_body(a:Parameters<typeof print_body>[0],reply:FastifyReply){
    reply.type('text/html').send(print_body({...a,menu:this.get_cache().menu}))
  }  
  register_static(){
    this.app.register(fastify_static, {
      root: 'c:/yigal/mc2/images', // Root filesystem path
      prefix: '/', // URL prefix (optional)
      wildcard:false,
      extensions:['.css','.png']
    });
  }

  send_page:RouteHandlerMethod =async  (request, reply)=> {
    const {cache,session_id}= request.state
    const page=utils.calc_page(request,reply)   
    if (page==null) return 
    
    const post=cache.posts_index[page]
    if (post==null)
      return this.send_body({body:'page not found'},reply)
    //writeFile('debug/textile.txt',post.post_content)
    const markdown=textile.textileToMarkdown(post.post_content||'')
    //writeFile('mark.md',markdown)
    const body=await marked(markdown)
    const toc= toc_box_head(cache,post.ID)
    this.send_body({...post,body,...toc,session_id},reply)
  }
}
async function bootstap(){
  const app = Fastify({logger: true})
  const server= new MyServer(app)
  await server.start()
  await app.listen({ port: 81 })
}
await bootstap()