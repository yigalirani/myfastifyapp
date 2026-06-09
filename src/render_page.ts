import type{ Selectable } from "kysely"
import type{ McUser } from "./autogen/database.js"
import { login_schema} from "./common.js"
import {make_html_form} from "./utils.js"

/*print_login_menu();
print_menu();
global $g;
date_default_timezone_set('America/New_York');
$date=date("Y");
*/
interface Meta{
  meta_description:string|null
  meta_keywords:string|null
  meta_logo:string|null
}
function tag(a:string|undefined,tag_name:string){
  if (a==null)
    return ''
  return `<${tag_name}>${a}</${tag_name}>`
}
export interface BodyParams{
  meta?:Meta
  post_sidebar?:string
  post_title?:string
  ID?:number,
  menu?:string
  body:string
  toc_section?: string
  next?:string
  last?:string
  session_id?:string
  user?:Selectable<McUser>|null
  edit_content?:string
}  

export function print_body(p: BodyParams){
  const { meta, post_sidebar, post_title, menu, body, toc_section,/*next,*/last,session_id,user,edit_content,ID}=p
  const meta_section=function(){
    if (meta==null)
      return ''
    return `<meta name='Description' content='${meta.meta_description}'>
    <meta name='keywords' content='${meta.meta_keywords}'>\n`
  }()
  const login_menu=function(){
    if (user==null)
        return "<a href='/login'>Login   </a>  ";
    const {user_login,user_full_name}=user
    const logged_as=user_full_name??user_login
    return `Logged in as: ${logged_as} | <a href='/account'>my account</a> |  <a href='/logout'>Logout</a>`;
  }()
  const edit_content_html=function(){
    if (edit_content==null||ID==null)
      return ''
    return `
      <a href='#' class=toggler> Edit </a><br>
      <div class="toggled hidden">
        edit page:
        <form action='/submit_edit' method='post'>
          <input type='hidden' name='url' value='${post_title}'>
          <textarea NAME='post_content' cols=80 rows=30>${edit_content}</textarea><br>
          <input type='hidden' name='post_id' value='${ID}'>
          <input name='action' type='submit' value='Submit' >
          <input name='action' type='submit' value='Preview' >
        </form>
      </div>`
  }()

  function div(a: string | undefined, class_name: string) {
    if (a == null || a === '')
      return ''
    return `<div class='${class_name}'>${a}</div>`
  }
  //       ${div(next, 'toc_box_next_link')}
  const logo=((meta?.meta_logo) ?? '')
  return `<!DOCTYPE html>
  <html>

  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" >
  <meta http-equiv=expires content=-1>
  <meta http-equiv=Cache-Control CONTENT=no-cache>
  <meta http-equiv=Pragma CONTENT=no-cache>

  <link rel="stylesheet" href="/client/style2.css" type="text/css" media="screen" >
    <script type="text/javascript" src="/client/script.js"></script>
  ${meta_section}

  <title>${post_title}</title>

  </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <a href='/cart_show'><img class=shop_header_icon src=/cart.png></a>
            ${logo}
           ${div(login_menu, 'header_login')}
          <div class=header_logo>
            <a href='/' ><img src='/logo.png' alt="xml marker"></a>
          </div>
          ${div(menu, 'header_menu')}
          <div class=header_bottom>
          </div>
        </div>
          <div class=content>
              <div class=sidebar>
                ${session_id??"session id not found"}
                ${div(toc_section, 'toc_box')}
                ${div(post_sidebar, 'post_sidebar')}
              </div>
              ${tag(post_title,'h1')}
              ${edit_content_html}
              ${div(body, 'content_body')}
              ${div(last, 'toc_box_next_link')}              
       
              <div class=copyright>
                      Copyright &copy;  2003 - ${new Date().getFullYear()} by symbol click. <A href="http://symbolclick.com/about.htm">Contact info</A>
              </div>
          </div>
      </div>
      
    </body>
  </html>
`
}
function submit(title:string){
  return `<div class=form_entry><button type="submit">${title}</button></div>`
}

export const render_login_form=make_html_form(login_schema,
`<form action="/login" method="POST">
<div class=login>
###
${submit('ok')}
  <div class=form_comment>Dont have a symbol click account? <a href=/register>Register</a> </div> 
  <div class=form_comment>Forgot or dont have a password? <a href=/reset_password>Reset password</a></div>
</div>
</form>
`
)

