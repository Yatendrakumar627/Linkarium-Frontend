import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('/node_modules/three/') || id.includes('/node_modules/@react-three/')) {
              return 'vendor-three';
            }
            if (id.includes('/node_modules/@mantine/')) {
              return 'vendor-mantine';
            }
            if (id.includes('/node_modules/framer-motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('/node_modules/@tabler/icons-react/')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
})
