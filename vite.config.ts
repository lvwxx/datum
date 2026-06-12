/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // CodeMirror 的扩展依赖 instanceof 校验,整个运行时必须只有一份 @codemirror/state 与 view 实例。
  // Vite 预打包(optimizeDeps)可能产生多份实例 → 报 "Unrecognized extension value"。
  // dedupe 强制这些核心包始终解析到同一份,根治该白屏/渲染错误。
  resolve: {
    dedupe: ["@codemirror/state", "@codemirror/view"],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Vitest configuration
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
}));
