import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerBranchRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/branches - Get all branches
  app.fastify.get(
    '/api/branches',
    {
      schema: {
        description: 'Get all branches',
        tags: ['branches'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                address: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({}, 'Fetching branches');

      try {
        const branchList = await app.db
          .select({
            id: schema.branches.id,
            name: schema.branches.name,
            address: schema.branches.address,
          })
          .from(schema.branches);

        app.logger.info({ count: branchList.length }, 'Branches fetched successfully');

        return branchList.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
        }));
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch branches');
        throw error;
      }
    }
  );
}
