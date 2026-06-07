import { Type} from '@sinclair/typebox'
export const config_schema = Type.Object({
  connectionString: Type.String(),
  connection:Type.Object({
    database: Type.String(),
    host: Type.String(),
    user: Type.String(),
    password: Type.String(),
    port: Type.Number(),
    connectionLimit: Type.Number(),
  }),
  secret: Type.String(),
  salt:Type.String(),
  peper:Type.String()
})

export const login_schema = Type.Object({
  email:Type.String({ format: 'email' }),
  password:Type.String()
})
/*
"fields":[
  {"name":'email',"type":'email'},
  {"name":'password',"type":'password'}
]*/