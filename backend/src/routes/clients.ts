import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerClientRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/clients - Get all clients for the user's practice
  app.fastify.get(
    '/api/clients',
    {
      schema: {
        description: 'Get all clients',
        tags: ['clients'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: ['string', 'null'] },
                phone: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({}, 'Fetching clients');

      try {
        const clientList = await app.db
          .select({
            id: schema.clients.id,
            name: schema.clients.name,
            email: schema.clients.email,
            phone: schema.clients.phone,
          })
          .from(schema.clients);

        app.logger.info({ count: clientList.length }, 'Clients fetched successfully');

        return clientList.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
        }));
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch clients');
        throw error;
      }
    }
  );
}
