import { invoke } from "@tauri-apps/api/core";

export interface RedisKeyValue {
  key: string;
  keyType: string;
  columns: string[];
  rows: string[][];
}
export interface RedisKeyDetail {
  key: string;
  keyType: string;
  ttl: number;  // -1 永不过期,-2 不存在
  size: number;
}

export const redisConnect = (id: string) => invoke<void>("redis_connect", { id });
export const redisScan = (id: string, pattern: string) => invoke<string[]>("redis_scan", { id, pattern });
export const redisGetKey = (id: string, key: string) => invoke<RedisKeyValue>("redis_get_key", { id, key });
export const redisKeyDetail = (id: string, key: string) => invoke<RedisKeyDetail>("redis_key_detail", { id, key });
export const redisExec = (id: string, command: string) => invoke<string>("redis_exec", { id, command });
