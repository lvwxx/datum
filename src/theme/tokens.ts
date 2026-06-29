export type ThemeName = "light" | "dark";
export type Tokens = Record<string, string>;

/**
 * Datum 设计系统 token —— 单一绿色 accent、暗色为主、Manrope + mono。
 * 两个主题的 key 必须完全一致(tokens.test 会校验)。
 */
export const THEMES: Record<ThemeName, Tokens> = {
  dark: {
    // 表面层级(靠明度区分,而非边框)
    "--bg": "#121212",
    "--bg-panel": "#181818",
    "--titlebar-bg": "#181818",
    "--sidebar-bg": "#000000",
    "--tabstrip-bg": "#181818",
    "--editor-bg": "#121212",
    "--statusbar-bg": "#181818",
    "--header-bg": "#1f1f1f",
    "--raised-bg": "#1f1f1f",
    "--item-active-bg": "#1f1f1f",

    // 边框 / 分隔
    "--border": "rgba(255,255,255,0.06)",
    "--hairline-strong": "rgba(255,255,255,0.1)",

    // 文本层级
    "--fg": "#ffffff",
    "--fg-bright": "#fdfdfd",
    "--fg-soft": "#cbcbcb",
    "--fg-muted": "#b3b3b3",
    "--fg-faint": "#7c7c7c",

    // 结果单元格灰阶分级:主值 → 软值 → 次级 → 哈希块 → 凹陷
    "--cell-strong": "#ededed",
    "--cell": "#cfcfcf",
    "--cell-dim": "#9a9a9a",
    "--cell-hash": "#6e6e6e",
    "--cell-null": "#585858",

    // 绿色 accent(仅功能性使用)
    "--accent": "#1db954",
    "--accent-bright": "#1ed760",
    "--accent-hover": "#28e06b",
    "--accent-press": "#169c46",
    "--on-accent": "#08110b",

    // 状态底色
    "--selection": "rgba(30,215,96,0.10)",
    "--row-hover": "rgba(255,255,255,0.055)",
    "--zebra": "rgba(255,255,255,0.018)",
    "--dirty-bg": "rgba(255,164,43,0.14)",

    // 语义色
    "--error": "#f3727f",
    "--negative": "#f3727f",
    "--warning": "#ffa42b",
    "--info": "#539df5",

    // 环境徽章
    "--env-prod": "#f3727f", "--env-staging": "#ffa42b", "--env-local": "#1ed760",

    // SQL / 详情语法色
    "--syn-keyword": "#539df5",
    "--syn-string": "#fdfdfd",
    "--syn-number": "#ffa42b",
    "--syn-entity": "#ffffff",
    "--syn-type": "#7c7c7c",
    "--syn-const": "#539df5",
    "--syn-operator": "#cbcbcb",
  },
  light: {
    "--bg": "#ffffff",
    "--bg-panel": "#f5f6f8",
    "--titlebar-bg": "#e9e9eb",
    "--sidebar-bg": "#f5f6f8",
    "--tabstrip-bg": "#edeef1",
    "--editor-bg": "#fbfbfc",
    "--statusbar-bg": "#f0f1f3",
    "--header-bg": "#f4f5f7",
    "--raised-bg": "#e7e9ed",
    "--item-active-bg": "#e2e5ea",

    "--border": "rgba(0,0,0,0.08)",
    "--hairline-strong": "rgba(0,0,0,0.1)",

    "--fg": "#1d1d1f",
    "--fg-bright": "#000000",
    "--fg-soft": "#4a4c52",
    "--fg-muted": "#5b5d63",
    "--fg-faint": "#9a9aa0",

    // 结果单元格灰阶分级:主值 → 软值 → 次级 → 哈希块 → 凹陷
    "--cell-strong": "#2e2e33",
    "--cell": "#4a4c52",
    "--cell-dim": "#6b6b70",
    "--cell-hash": "#9a9aa0",
    "--cell-null": "#b0b0b6",

    "--accent": "#1db954",
    "--accent-bright": "#159048",
    "--accent-hover": "#16a449",
    "--accent-press": "#13923f",
    "--on-accent": "#08110b",

    "--selection": "rgba(30,183,86,0.12)",
    "--row-hover": "rgba(0,0,0,0.04)",
    "--zebra": "rgba(0,0,0,0.022)",
    "--dirty-bg": "rgba(180,83,9,0.10)",

    "--error": "#d23f4b",
    "--negative": "#d23f4b",
    "--warning": "#b45309",
    "--info": "#2563eb",

    "--env-prod": "#d23f4b", "--env-staging": "#b45309", "--env-local": "#1db954",

    "--syn-keyword": "#2563eb",
    "--syn-string": "#157a3a",
    "--syn-number": "#b45309",
    "--syn-entity": "#1d1d1f",
    "--syn-type": "#9a9aa0",
    "--syn-const": "#2563eb",
    "--syn-operator": "#5b5d63",
  },
};
