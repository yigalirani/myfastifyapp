
/*print_login_menu();
print_menu();
global $g;
date_default_timezone_set('America/New_York');
$date=date("Y");
*/
interface Meta{
  meta_description:string
  meta_keywords:string
  logo:string
}
export function print_body({meta,sidebar,post_title,login_menu,menu,body}:{
  meta?:Meta
  sidebar?:string
  post_title?:string
  login_menu?:string
  menu?:string
  body:string
}){
  const meta_section=function(){
    if (meta==null)
      return ''
    return `<meta name='Description' content='${meta.meta_description}'>
    <meta name='keywords' content='${meta.meta_keywords}'>\n`
  }()
  //    $g->body=str_replace("<!--error--!>",$g->error,$g->body);
  const sidebar_section=function(){
    if (sidebar==null)
      return '<div class=sidebar2>&nbsp</div>'
    return `<div class='sidebar'>${sidebar}</div>`
  }()

  return`<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
  <html>

  <head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" >
  <meta http-equiv=expires content=-1>
  <meta http-equiv=Cache-Control CONTENT=no-cache>
  <meta http-equiv=Pragma CONTENT=no-cache>

  <link rel="stylesheet" href="/style2.css" type="text/css" media="screen" >
  <script type="text/javascript" src="/$g->php_dir/script.js"></script>
  ${meta_section}

  <title>${post_title}</title>

  </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <a href='/cart_show'><img class=shop_header_icon src=/cart.png></a>
                                  ${meta?.logo||''}
          <div class="header_login">
            ${login_menu||''}
          </div>	
          <div class=header_logo>
            <a href='/' ><img src='/logo.png' alt="xml marker"></a>
          </div>
          <div class="header_menu">
            ${menu||''}
          </div>

          <div class=header_bottom>
          </div>
        </div>
          <div class=content>
              ${sidebar_section}
              <div class="content_body">
                      ${body}
              </div>
              <div class=copyright>
                      Copyright &copy;  2003 - ${new Date().getFullYear()} by symbol click. <A href="http://symbolclick.com/about.htm">Contact info</A>
              </div>
          </div>
      </div>
      
    </body>
  </html>

`
}