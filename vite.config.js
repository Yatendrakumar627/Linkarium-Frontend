import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'zustand', '@react-three/fiber'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@mantine/core', '@mantine/hooks', 'react-router-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/')
          if (norm.includes('/node_modules/')) {
            if (
              norm.includes('/node_modules/react/') ||
              norm.includes('/node_modules/react-dom/') ||
              norm.includes('/node_modules/react-router/') ||
              norm.includes('/node_modules/react-router-dom/') ||
              norm.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react'
            }
            if (
              norm.includes('/node_modules/three/') ||
              norm.includes('/node_modules/@react-three/')
            ) {
              return 'vendor-three'
            }
            if (norm.includes('/node_modules/@mantine/')) {
              return 'vendor-mantine'
            }
            if (norm.includes('/node_modules/framer-motion/')) {
              return 'vendor-motion'
            }
            if (norm.includes('/node_modules/@tabler/icons-react/')) {
              return 'vendor-icons'
            }
          }
        },
      },
    },
  },
})