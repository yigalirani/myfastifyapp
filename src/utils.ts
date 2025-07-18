import { readFileSync } from 'fs';
import { ZodType } from "zod";
import { createPool,PoolOptions } from 'mysql2' 
import { Kysely, MysqlDialect, } from 'kysely'
export function read_zod<T>(filename: string, schema: ZodType<T>): T {
  const config_data = readFileSync(filename, 'utf-8');  //read sync so doent need the buildfasity pattern
  return schema.parse(JSON.parse(config_data));
}
export function mysql_pool<T>(connection:PoolOptions){
  const dialect = new MysqlDialect({
    pool: createPool(connection)
  })
  const db = new Kysely<T>({dialect})
  return db
}