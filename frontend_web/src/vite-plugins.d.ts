declare module '@vitejs/plugin-react' {
  import type { Plugin } from 'vite';
  const plugin: (options?: any) => Plugin;
  export default plugin;
}
