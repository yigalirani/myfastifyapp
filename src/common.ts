import { Type,type Static} from '@sinclair/typebox'
export const config_schema = Type.Object({
  connection:Type.Object({
    database: Type.String(),
    host: Type.String(),
    user: Type.String(),
    password: Type.String(),
    port: Type.Number(),
    connectionLimit: Type.Number(),
  }),
  secret: Type.String(),
  license_salt:Type.String(),
  license_peper:Type.String(),
  password_salt:Type.String()

})

export const login_schema = Type.Object({
  email:Type.String({ format: 'email' }),
  password:Type.String({format: 'password'})
})
export type Login=Static<typeof login_schema>
