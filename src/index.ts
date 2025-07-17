import Fastify,{FastifyInstance } from 'fastify'
import mysql from '@fastify/mysql'
import env from '@fastify/env'

const config_schema = {
  type: 'object',
  required: ['connectionString'],
  properties: {
    connection: { type: 'string', default: '3000' }
  }
}

async function  make_app(app:FastifyInstance){
  await app.register(env, {
    confKey: 'config',
    schema:config_schema,
    dotenv: true // loads from .env automatically
  })
  const {connectionString}=app.config
  app.register(mysql, {
    connectionString: 'mysql://root@localhost/mysql'
  })
  // Declare a route
  app.get('/', async function handler (request, reply) {
    reply.type('text/html').send('<h1>hello</h1> this is html')
  })
  return app
}

// Run the server!
async function runit(){
  const app = Fastify({logger: true})
  try {
    await make_app(app)
    await app.listen({ port: 3000 })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

runit()