import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Two pages: the main site and the 3D burger landing page.
      input: { main: page('./index.html'), burger: page('./burger.html') },
      output: {
        manualChunks: (id: string) =>
          /node_modules\/three\//.test(id) ? 'three' : /node_modules\/(gsap|@gsap)\//.test(id) ? 'gsap' : undefined,
      },
    },
  },
})
