import { readFile } from 'node:fs/promises';
import * as crypto from "node:crypto";
import type {DB,McOrder} from './autogen/database'
import * as utils from './utils'
import { create } from 'xmlbuilder2';
interface LicenseDetails{
  licensed_to   : string,
  expires       : string|null
  license_type  : string,
  user_count    : number,
  license_number: number,
  note          : string|null,
  token         : string
}
export function calc_md5(input: string): string {
  return crypto.createHash("md5")
    .update(input, "utf8")
    .digest("hex");
}
function to_trimmed_string(a:string|number|null){
  if (a==null)
    return ''
  return `${a}`.trim()
}

export  function sign(text: string,key:Buffer<ArrayBuffer>){
  // Read private key exactly like PHP
  

  // Equivalent to openssl_private_encrypt()
  const encrypted = crypto.privateEncrypt(
    {
      key,
      padding: crypto.constants.RSA_PKCS1_PADDING, // PHP default
    },
    Buffer.from(text, "utf8")
  );

  // Equivalent to bin2hex()
  return encrypted.toString("hex");
}
function splithex(input: string): string {
    let ans = "";
    const len = input.length;

    for (let i = 0; i < len; i += 4) {
        if (i % 60 === 0 && i !== 0) {
            ans += "\n        ";
        }
        const s = input.substring(i, i + 4);
        ans += s + " ";
    }

    return ans;
}
 function enc_license(a:LicenseDetails,template:string,key:Buffer<ArrayBuffer> ){
    const fields:(keyof LicenseDetails)[]=['licensed_to','expires','license_type','user_count','license_number','note','token']//can you get this from the type definition
    const normalized=fields.map(to_trimmed_string).join('')
    const md5=calc_md5(normalized);
    const signature = sign(md5,key)
    return `<license>
    <licensed_to>${a.licensed_to}</licensed_to>
    <expires>${a.expires}</expires>
    <license_type>${a.license_type}</license_type>
    <user_count>${a.user_count}</user_count>
    <license_number>${a.license_number}</license_number>
    <note>${a.note}</note>
    <token>${a.token}</token>
    <signature>${signature}</signature>
</license>`
}
//    $details['token']=md5("salt of license".$lic->id."peper");
//}
/*async function send_emails(order:Selectable<McOrder>) { //what type should i use for order?
  const {order_product_id}=order
  const license_type=(order_product_id===2?'Non-commercial license':'')
 
interface license_detaild{
    licensed_to:order.order_licensed_to,
    user_count:order.order_qty,
    licensed_to_email:order.order_licensed_to_email,
    license_type
  }

  const template=readFile('licence_template.htm','utf8')
  return details
}*/

async function resend(order_num:number){
  const {config_schema}=utils
  const {connection,salt,peper}= utils.read_zod('./config.json',config_schema)
  const db=utils.mysql_pool<DB>(connection)
  const order=await db.selectFrom('mc_order').where('order_id','=',order_num).selectAll().executeTakeFirstOrThrow()
  const {lic_id}=await db.insertInto('mc_lic').defaultValues().returning('lic_id').executeTakeFirstOrThrow();
  const details:LicenseDetails={
    license_number:lic_id,
    licensed_to:order.order_licensed_to,
    user_count:order.order_qty,
    //licensed_to_email:order.order_licensed_to_email,
    license_type:(order.order_product_id===2?'Non-commercial license':''),
    expires:null,
    note:null,
    token:calc_md5(`${salt}${lic_id}${peper}`)
  }
  const template=await readFile('licence_template.htm','utf8')
  const key = await readFile("private_key.pem");
  const lic=enc_license(details,template,key)
  console.log(lic)
}
void resend(3422)
