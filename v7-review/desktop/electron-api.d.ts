export {};

declare global {
  interface Window {
    // Renderer typing is intentionally loose: the preload surface is defined in electron/preload.ts
    // and many screens rely on different subsets.
    electronAPI: any;
  }
}
