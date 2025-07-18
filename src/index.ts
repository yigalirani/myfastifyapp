import Fastify,{FastifyInstance,} from 'fastify'
import {DB} from './autogen/database'
import varlog from "varlog"
import * as utils from './utils'
import { z } from "zod";
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

async function build_server(app:FastifyInstance){
  const {connection}= utils.read_zod('./config.json',config_schema)
  const db=utils.mysql_pool<DB>(connection)

  app.get<{Params: {page: string}}>(
    '/:page(.*).htm', async function handler (request, reply) {
    const { page } = request.params;
    const rows=await db.selectFrom('mc_post').where('post_name','=',page).selectAll().executeTakeFirst()
    const content=varlog.css+varlog.dump('res',rows)
    reply.type('text/html').send(content)
  })
}
async function bootstap(){
  const app = Fastify({logger: true})
  await build_server(app)
  app.listen({ port: 3000 })
}
bootstap()