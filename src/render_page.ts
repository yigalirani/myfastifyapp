import type{ Selectable } from "kysely"
import type{ McUser } from "./autogen/database.js"

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
  menu?:string
  body:string
  toc_section?: string
  next?:string
  last?:string
  session_id?:string
  user?:Selectable<McUser>|null
}  

export function print_body(p: BodyParams){
  const { meta, post_sidebar, post_title, menu, body, toc_section,/*next,*/last,session_id,user }=p
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
    return `Logged in as: ${logged_as} | <a href='/account'>my account</a> |  <a href='/logout>Logout</a>`;
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

  <link rel="stylesheet" href="/style2.css" type="text/css" media="screen" >
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">
  <script type="text/javascript" src="/script.js"></script>
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

interface Login{
  email:string
  password:string
  [key: string]: string
}
interface GenInput{
  title?:string,
  type?:string,
  name:string,
  data:Record<string,string>
  errors:Record<string,string>
  extra?:string
}
function gen_input(a:GenInput){
  const {title,name,data,errors,extra,type}=a
  const value=data[name]
  const error=errors[name]
  const value_attr=value==null?'':`value=${value}`
  const error_span=error==null?'':`<span id="${name}_error" class="error_msg" aria-live="assertive">${error}</span>`;
  return  `<label for="${name}">${title??name}:</label>
      <input 
        id="id_${name}"
        name="name"
        class="form_input"
        type="${type??'text'}" 
        required 
        ${extra}
        ${value_attr}
        aria-invalid="true"
        aria-describedby="user_email_error"
        value="${data.email}"
      >
       ${error_span}`
}
export function render_login_form(data:Login,errors:Login){
  return `<div class=login>
<form action="/login" method="POST">
${gen_input({name:'email',data,errors,type:'email'})}
${gen_input({name:'password',data,errors,type:'password'})}    
</form>
<br>Dont have a symbol click acount? <a href=/register>Register</a> <br>Forgot or dont have a password? <a href=/reset_password>Reset password</a><br>
</div>`
};

