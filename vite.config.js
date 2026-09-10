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
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — tiny, changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Three.js ecosystem — very large, changes rarely
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          // Mantine UI — large, changes rarely
          'vendor-mantine': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/modals',
            '@mantine/notifications',
            '@mantine/charts',
          ],
          // Animation — medium, separate cache entry
          'vendor-motion': ['framer-motion'],
          // Icons — large icon set
          'vendor-icons': ['@tabler/icons-react'],
        },
      },
    },
  },
})
