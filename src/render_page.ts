
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

export function print_body({ meta, post_sidebar, post_title, login_menu, menu, body, toc_section,/*next,*/last }: {
  meta?:Meta
  post_sidebar?:string
  post_title?:string
  login_menu?:string
  menu?:string
  body:string
  toc_section?: string
  next?:string
  last?:string
}){
  const meta_section=function(){
    if (meta==null)
      return ''
    return `<meta name='Description' content='${meta.meta_description}'>
    <meta name='keywords' content='${meta.meta_keywords}'>\n`
  }()
  //    $g->body=str_replace("<!--error--!>",$g->error,$g->body);

  function div(a: string | undefined, class_name: string) {
    if (a == null || a === '')
      return ''
    return `<div class='${class_name}'>${a}</div>`
  }
  //       ${div(next, 'toc_box_next_link')}
  const logo=((meta?.meta_logo) || '')
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