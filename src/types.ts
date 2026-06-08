export type DbKind = "pg" | "redis";
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
}

export interface AppError {
  kind: "connection" | "query" | "edit" | "credential" | "config" | "notFound";
  message: string;
  detail?: string | null;
}
