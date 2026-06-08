export type ThemeName = "light" | "mirage";
export type Tokens = Record<string, string>;

export const THEMES: Record<ThemeName, Tokens> = {
  light: {
    "--bg": "#FCFCFC", "--bg-panel": "#F3F4F5", "--border": "#E7EAED",
    "--fg": "#5C6166", "--fg-muted": "#ABADB1", "--accent": "#FF9940",
    "--selection": "#D3E1F5", "--dirty-bg": "#FFF0DD",
    "--syn-keyword": "#FA8D3E", "--syn-string": "#86B300", "--syn-entity": "#399EE6",
    "--syn-type": "#55B4D4", "--syn-const": "#A37ACC", "--syn-operator": "#ED9366",
    "--error": "#E65050",
    "--env-prod": "#E65050", "--env-staging": "#FA8D3E", "--env-local": "#4CBF99",
  },
  mirage: {
    "--bg": "#1F2430", "--bg-panel": "#1C212B", "--border": "#3A4151",
    "--fg": "#CCCAC2", "--fg-muted": "#6C7A8B", "--accent": "#FFCC66",
    "--selection": "#33415E", "--dirty-bg": "#3A3A28",
    "--syn-keyword": "#FFAD66", "--syn-string": "#D5FF80", "--syn-entity": "#73D0FF",
    "--syn-type": "#5CCFE6", "--syn-const": "#DFBFFF", "--syn-operator": "#F29E74",
    "--error": "#FF6666",
    "--env-prod": "#FF6666", "--env-staging": "#FFAD66", "--env-local": "#95E6CB",
  },
};
