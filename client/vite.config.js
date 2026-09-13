import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Proxy all /api requests to the Express backend (avoids CORS in dev)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path  // preserve /api prefix
      }
    }
  },

  build: {
    // Produce ES module chunks for better tree-shaking
    target: 'es2015',
    // Warn when a single chunk exceeds 800 kB
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor libraries into separate chunks for better caching
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor':     ['framer-motion', 'react-icons', 'react-hot-toast'],
          'chart-vendor':  ['recharts'],
          'web3-vendor':   ['ethers'],
          'face-vendor':   ['face-api.js'],
        }
      }
    }
  },

  // Ensure environment variables are correctly exposed
  envPrefix: 'VITE_',

  // Improve HMR performance on Windows
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'framer-motion']
  }
})
