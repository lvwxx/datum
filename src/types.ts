export type DbKind = "pg" | "redis" | "mysql" | "sqlite";
export type Env = "local" | "staging" | "prod";

export interface Connection {
  id: string;
  name: string;
  kind: DbKind;
  env: Env;
  host: string;
  port: number;
  user: string;
  database: string;
  plaintextPassword?: string | null;
  /** 仅 SQLite 使用:数据库文件的绝对路径 */
  filePath?: string | null;
}

export interface AppError {
  kind: "connection" | "query" | "edit" | "credential" | "config" | "notFound";
  message: string;
  detail?: string | null;
}
