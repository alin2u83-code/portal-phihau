import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

function claudeProxyPlugin(apiKey: string): Plugin {
  return {
    name: 'claude-proxy-dev',
    configureServer(server) {
      server.middlewares.use(
        '/api/claude-proxy',
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          if (!apiKey) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'CLAUDE_API_KEY nu este configurat în .env' }));
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const { messages, system } = body;

              if (!messages || !Array.isArray(messages)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Format mesaje invalid' }));
                return;
              }

              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: 'claude-sonnet-4-6',
                  max_tokens: 4096,
                  system: system || '',
                  messages,
                }),
              });

              const data = await response.json();
              res.writeHead(response.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            } catch (error: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load ALL env vars (empty prefix = no filter)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      claudeProxyPlugin(env.CLAUDE_API_KEY || ''),
    ],
  };
});
