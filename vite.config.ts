import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "node:path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/react-markdown')) return 'markdown';
          if (id.includes('node_modules/pdfjs-dist')) return 'pdf';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) return 'react';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/react-hot-toast')) return 'toast';
          if (id.includes('node_modules/dompurify')) return 'security';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
}))
