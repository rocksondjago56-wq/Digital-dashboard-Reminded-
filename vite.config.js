import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the "chunk is too large" warning threshold to 600 kB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split the heavy xlsx library into its own lazy chunk
        manualChunks(id) {
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          if (id.includes('node_modules/react')) return 'react-vendor';
        }
      }
    }
  }
})

