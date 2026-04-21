import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,  // Phaser alone is ~1MB, that's expected
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requires manualChunks as a function
        manualChunks(id) {
          // Phaser is dynamically imported in GameCanvas so it's already
          // code-split automatically — this just gives it a predictable name.
          if (id.includes('phaser')) return 'phaser';
          if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor';
        },
      },
    },
  },
})
