import Fastify,{type FastifyRequest,type RouteHandlerMethod , type FastifyInstance, type FastifyReply,type onRequestAsyncHookHandler,type RouteHandler} from 'fastify'
import type {DB,McPost,McUser} from './autogen/database.js'
import * as utils from './utils.js'
import * as textile from './textile.js'
import * as common from './common.js'
import form_body from "@fastify/formbody";
import { resolve } from 'upath';
import {print_body,type BodyParams,render_login_form} from './render_page.js'
import {keyBy} from 'lodash-es';
import { marked } from 'marked'
import fastify_static from '@fastify/static';
import type { Kysely,Selectable} from 'kysely'
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type {Static } from "@sinclair/typebox";
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
/*function toc_comments(comments:Selectable<McComment>) {
    const toc=new utils.TOC({
        get_fields(a:Selectable<McComment>){
          return{
            id:a.comment_id,
            parent_id:a.comment_parent_id,
            is_start:a.comment_parent_id===0
          }
        },
        render_item(data:Selectable<McComment>){
          const {post_title,post_name}=data
          return{
            title:post_title,
            href:`/${post_name}.htm`
          }
        }
      },
      cache.posts  
    ).ans  
}*/
function toc_box_head(cache:Cache,post_id:number) { //starting with this post_id, build the toc, also get met
    const toc=new utils.TOC({
        get_fields(a:Selectable<McPost>){
          return{
            id:a.ID,
            parent_id:a.post_parent
          }
        },
        start_id:post_id,
        render_item(data:Selectable<McPost>,class_name?:string){
          const {post_title,post_name}=data
          const class_attr=class_name?`class='class_name'`:''
          return `<a ${class_attr} href="/${post_name}.htm}">${post_title}</a>`
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
function print_comments(ree){
    print_comment_form();
    $q=get_comment_query();
    $comments=mc_query_all ($q,"comment_id");
     add_children($comments,'comment_parent_id','comment_id');
     foreach($comments as $comment){
         if ($comment['comment_parent_id'])
             break;
         print_comment($comments,$comment,0);
     }
}
*/

type CacheType=Awaited<ReturnType<typeof make_cache>>
interface State{
  session_id:string
  cache:CacheType
  user:Selectable<McUser>|undefined
}
declare module 'fastify' {
  interface FastifyReply {
    state: State;
  }
}

function send_body(reply:FastifyReply,a:BodyParams){
  const {cache:{menu},session_id,user}=reply.state
  reply.type('text/html').send(print_body({...a,session_id,menu,user}))
}  
function register_standard_plugins(app:FastifyInstance){
  app.register(fastify_static, {
    root: 'c:/yigal/mc2/images', // Root filesystem path
    prefix: '/', // URL prefix (optional)
    wildcard: false,
    extensions: ['.png'],
    maxAge: 31_536_000_000,
    immutable: true
  });
  const root=resolve('client')
  app.register(fastify_static, {
    root, // Root filesystem path
    prefix: '/client', // URL prefix (optional)
    wildcard: false,
    extensions: ['.js','.css'],
    maxAge: 31_536_000_000,
    immutable: true,
    decorateReply: false
  });  

  
  app.register(cookie, {
      parseOptions: {}, // cookie.parse options
  });     
  app.register(form_body);
}
//@ts-expect-error this function converts all posts from textile to markdown in one shot, worked super fast to develop
async function _convert_it(){
  const config=utils.read_typebox('./config_local.json',common.config_schema)
  const db=utils.mysql_pool<DB>(config.connection) 
  const posts=await db.selectFrom('mc_post').selectAll().execute()
  for (const {ID,post_content} of posts){
    const post_markdown=textile.textileToMarkdown(post_content||'')
    await db.updateTable('mc_post').set({post_markdown}).where('ID', '=', ID).executeTakeFirst();
  }
}

class MyServer{
  config_schema=common.config_schema
  config
  db
  cache:CacheType|undefined
  app
  constructor(){
    this.app=Fastify({logger: true}).withTypeProvider<TypeBoxTypeProvider>();
    this.config=utils.read_typebox('./config_local.json',this.config_schema)
    this.db=utils.mysql_pool<DB>(this.config.connection) 
    register_standard_plugins(this.app) 
  
    this.app.addHook('onRequest',this.on_request)
    this.app.get('/login',(request,reply)=>
      send_body(reply,{body:render_login_form()})
    )   
    this.app.get('/logout',async (request,reply)=>{
      const {user}=reply.state
      if (user)
        await  this.db.updateTable('mc_user').set({ user_session:'' }).where('user_email', '=', user.user_email).executeTakeFirst();
      reply.redirect('/')
    })
    this.app.get('/*',this.send_page)
    this.app.post('/login',{ schema: { body: common.login_schema } },this.on_login)
    this.app.post('/edit_preview',{ schema: { body: common.post_schema }},this.on_edit('preview'))
    this.app.post('/edit_submit',{ schema: { body: common.post_schema }},this.on_edit('submit'))
  }
  on_edit = (mode: 'preview' | 'submit'): RouteHandler<{ Body: Static<typeof common.post_schema> }> => async (request, reply) => {
    const {cache,session_id,user}= reply.state      
    const {ID,post_markdown}=request.body
    const post=await this.db.selectFrom('mc_post').selectAll().where('ID', '=', ID).executeTakeFirst(); //cant use the cache because i only have the id and the cache is indected by post_name
    if (post==null)
      return send_body(reply,{body:'page not found'})
    const body=await marked(post_markdown)
    const toc= toc_box_head(cache,post.ID)
    if (user?.user_status!==2){
      reply.redirect('/')
      return
    }
    if (mode==='preview')
      return send_body(reply,{...post,body,...toc,session_id,ID,edit_content:post_markdown})      
    await this.db.updateTable('mc_post').set({post_markdown }).where('ID','=', ID).execute()
    this.cache=await make_cache(this.db)//invalidating the cache after db update
    reply.redirect(`/${post.post_name}.htm`)
  }
  on_login:RouteHandler<{ Body: common.Login }>= async(request,reply)=>{
      //dont try to make this standlone functin, its impossible per chat https://chatgpt.com/c/6a27dc07-fe2c-83ed-b0bc-03edfe586c3c
      //edit: i did change it but it has problems, it is not type safe completly https://claude.ai/share/b3d676d0-93f7-4aa4-813b-7f87e05b3ae1
      const {body}=request
      const { email, password } = body
      const {session_id}=reply.state
      const user=await this.db.selectFrom('mc_user').selectAll().where('user_email', '=', email).executeTakeFirst();
      const hashed_pass=utils.calc_md5(`${password}${this.config.password_salt}`)
      const errors=function(){
        const ans:Partial<Static<typeof common.login_schema>>={}
        if (user==null){
          ans.email="user not found"
          return ans
        }
        if (user.user_pass!==hashed_pass)
          ans.password="wrong password"
        return ans
      }()
      if (Object.entries(errors).length)
        send_body(reply,{body:render_login_form(body,errors)})
      await  this.db.updateTable('mc_user').set({ user_session:session_id }).where('user_email', '=', email).executeTakeFirst();
      reply.redirect('/')
  }
  async make_state(request:FastifyRequest, reply:FastifyReply){
    const {secret}=this.config

    const cache=this.cache
    if (cache==null)
      throw new Error("server not ready yet, try again later")
    const session_id=utils.calc_session_id(request, reply,secret)
    const user = await this.db.selectFrom('mc_user').selectAll().where('user_session', '=', session_id).executeTakeFirst();
    const ans:State= {session_id,cache,user}
    return ans
  }  
  on_request:onRequestAsyncHookHandler=async (request,reply)=>{
    reply.state=await this.make_state(request,reply)
  }
  async start(){
    this.cache=await make_cache(this.db)   
    await this.app.listen({ port: 81 })
  }

  send_page:RouteHandlerMethod =async  (request, reply)=> {
    const {cache,session_id,user}= reply.state
    const page=utils.calc_page(request,reply)   
    if (page==null) return 
    
    const post=cache.posts_index[page]
    if (post==null) 
      return send_body(reply,{body:'page not found'}) 
    //writeFile('debug/textile.txt',post.post_content)
    //const markdown=textile.textileToMarkdown(post.post_content||'')
    //const markdown=textile.textileToMarkdown(post.post_content||'')
    //writeFile('mark.md',markdown)
    const {ID,post_markdown}=post
    const body=await marked(post_markdown)
    const toc= toc_box_head(cache,post.ID)
    //const comments=this.db.selectFrom('mc_comment_view').selectAll().where("comment_post_id","=",ID).selectAll().execute()
    //const edit_content=user?.user_status===2&&body;
    const edit_content=user?.user_status===2?post_markdown:undefined
    send_body(reply,{...post,body,...toc,session_id,ID,edit_content})
  }
}
async function bootstap(){
  try{    const server= new MyServer()
    await server.start()
  }catch(ex){
    if (ex instanceof Error)
      console.warn('failed starting the server:',ex.message)
    process.exit(1)
  }
}
//await convert_it()
await bootstap()