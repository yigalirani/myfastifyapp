import Fastify,{FastifyInstance,} from 'fastify'
import mysql,{MySQLPool}from '@fastify/mysql'
import { readFileSync } from 'fs';

import { z ,ZodType } from "zod";
const config_schema = z.object({
  connectionString: z.string(),
});
function read_zod<T>(filename: string, schema: ZodType<T>): T {
  const config_data = readFileSync(filename, 'utf-8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}
declare module 'fastify' {
  interface FastifyInstance {
    mysql: MySQLPool
  }
}
const {connectionString}=read_zod('./config.json',config_schema)

async function  make_app(app:FastifyInstance){
  await app.register(mysql, {
    connectionString,
    promise: true,
  })
  // Declare a route
  app.get('/', async function handler (request, reply) {
    const [rows] = await app.mysql.query('SELECT * FROM your_table')
    reply.type('text/html').send('<h1>hello</h1> this is html')
  })
}

const app = Fastify({logger: true})
app.listen({ port: 3000 })


