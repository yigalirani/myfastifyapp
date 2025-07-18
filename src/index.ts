import Fastify,{FastifyInstance,} from 'fastify'
import mysql,{MySQLPool}from '@fastify/mysql'
import { readFileSync } from 'fs';
import {DB} from './autogen/database'

import { z ,ZodType } from "zod";
import { createPool } from 'mysql2' 
import { Kysely, MysqlDialect } from 'kysely'
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
function read_zod<T>(filename: string, schema: ZodType<T>): T {
  const config_data = readFileSync(filename, 'utf-8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}
declare module 'fastify' {
  interface FastifyInstance {
    mysql: MySQLPool
  }
}
async function build_server(app:FastifyInstance){
  const {connection,connectionString}= read_zod('./config.json',config_schema)

  const dialect = new MysqlDialect({
    pool: createPool(connection)
  })

  const db = new Kysely<DB>({
    dialect,
  })
  const users=await db.selectFrom('mc_post').selectAll().execute()
  console.log(users)

  await app.register(mysql, {
    connectionString
  })
  // Declare a route
  app.get('/', async function handler (request, reply) {
    const rows=await app.mysql.query('SELECT * FROM your_table')
    reply.type('text/html').send('<h1>hello</h1> this is html')
  })
}

const app = Fastify({logger: true})
build_server(app)
app.listen({ port: 3000 })


