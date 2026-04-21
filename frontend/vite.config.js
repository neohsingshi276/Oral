import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
            return 'recharts';
          }
          if (id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
