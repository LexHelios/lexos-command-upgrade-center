import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Force HTTPS configuration
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8080,
    https: {
      cert: fs.readFileSync('./certs/server.pem'),
      key: fs.readFileSync('./certs/server-key.pem')
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});