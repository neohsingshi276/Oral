import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // FIX: Add dev server proxy so local development doesn't hit CORS issues
    server: {
      proxy: env.VITE_API_URL ? {} : {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      // FIX: Increase chunk size warning limit — the Phaser game assets are large
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            react: ['react', 'react-dom'],
            router: ['react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
  }
})
