/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectFile: () => Promise<{ path: string, content: string } | null>;
  }
}
