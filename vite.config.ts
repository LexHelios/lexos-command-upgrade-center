import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Check if certificates exist
  const certExists = fs.existsSync('./certs/server.pem') && fs.existsSync('./certs/server-key.pem');
  const certExistsLocal = fs.existsSync('./certs/localhost.pem') && fs.existsSync('./certs/localhost-key.pem');
  
  // Use server certs if available, otherwise localhost certs
  const certPath = certExists ? './certs/server.pem' : './certs/localhost.pem';
  const keyPath = certExists ? './certs/server-key.pem' : './certs/localhost-key.pem';
  const httpsEnabled = certExists || certExistsLocal;
  
  return {
    server: {
      host: '0.0.0.0', // Listen on all interfaces
      port: 8080,
      https: httpsEnabled ? {
        cert: fs.readFileSync(certPath, 'utf8'),
        key: fs.readFileSync(keyPath, 'utf8'),
      } : false,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
          },
        }
      }
    },
    plugins: [
      react(),
      // mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react'],
          },
        },
      },
    },
  };
});