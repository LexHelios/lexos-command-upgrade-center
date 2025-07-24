import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function startViteWithHttps() {
  const server = await createServer({
    root,
    server: {
      host: '0.0.0.0',
      port: 8080,
      https: {
        cert: fs.readFileSync(path.join(root, 'certs/server.pem')),
        key: fs.readFileSync(path.join(root, 'certs/server-key.pem'))
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  });

  await server.listen();

  console.log('🔒 Vite HTTPS server running at:');
  console.log('   - https://localhost:8080');
  console.log('   - https://159.26.94.14:8080');
  console.log('✅ Microphone access enabled!');
}

startViteWithHttps().catch(console.error);