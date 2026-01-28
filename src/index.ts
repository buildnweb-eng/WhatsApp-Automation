import { Elysia } from 'elysia';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import {
  whatsappRoutes,
  razorpayRoutes,
  healthRoutes,
  adminRoutes,
} from './routes';

/**
 * Application Bootstrap
 */
async function bootstrap() {
  // Connect to MongoDB
  await connectDatabase();

  // Create Elysia app
  const app = new Elysia()
    // Global error handler
    .onError(({ error, code }) => {
      logger.error({ error, code }, '❌ Unhandled error');
      
      if (code === 'VALIDATION') {
        return { error: 'Validation error', details: error.message };
      }
      
      return { error: 'Internal server error' };
    })

    // Request logging middleware
    .onRequest(({ request }) => {
      const url = new URL(request.url);
      console.log(`→ ${request.method} ${url.pathname}`);
      logger.debug(
        { method: request.method, path: url.pathname },
        '→ Incoming request'
      );
    })

    // Response logging middleware
    .onAfterResponse(({ request, set }) => {
      const url = new URL(request.url);
      logger.debug(
        { method: request.method, path: url.pathname, status: set.status },
        '← Response sent'
      );
    })

    // Mount routes
    .use(healthRoutes)
    .use(whatsappRoutes)
    .use(razorpayRoutes)
    .use(adminRoutes)

    // Root endpoint
    .get('/', () => {
      console.log('🏠 Root endpoint called!');
      return {
        name: 'WhatsApp Catalog Automation',
        version: '1.0.0',
        status: 'running',
      };
    })

    // Payment success redirect (after Razorpay payment)
    .get('/payment/success', ({ query }) => {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .card {
                background: white;
                padding: 40px;
                border-radius: 16px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 400px;
              }
              .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #22c55e;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
              }
              .checkmark svg {
                width: 40px;
                height: 40px;
                fill: white;
              }
              h1 {
                color: #1f2937;
                margin: 0 0 10px;
              }
              p {
                color: #6b7280;
                margin: 0;
              }
              .whatsapp-btn {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 24px;
                background: #25D366;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="checkmark">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <h1>Payment Successful!</h1>
              <p>Thank you for your order. You'll receive a confirmation on WhatsApp shortly.</p>
              <a href="https://wa.me/${config.whatsapp.phoneNumberId}" class="whatsapp-btn">
                Return to WhatsApp
              </a>
            </div>
          </body>
        </html>
      `;
    })

    // Start server
    .listen(config.server.port);

  // Log startup banner
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 WhatsApp Catalog Automation Server                       ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   Status:     Running                                         ║
║   Port:       ${String(config.server.port).padEnd(43)}║
║   Mode:       ${config.server.nodeEnv.padEnd(43)}║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   Endpoints:                                                  ║
║   • Health:    GET  /health                                   ║
║   • WhatsApp:  POST /webhook/whatsapp                         ║
║   • Razorpay:  POST /webhook/razorpay                         ║
║   • Admin:     GET  /admin/*                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  logger.info(
    { port: config.server.port, env: config.server.nodeEnv },
    '✅ Server started'
  );

  return app;
}

// Start the application
bootstrap().catch((error) => {
  logger.error({ error }, '❌ Failed to start server');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

