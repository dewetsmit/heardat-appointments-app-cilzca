import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerProcedureRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/procedures - Get all procedures
  app.fastify.get(
    '/api/procedures',
    {
      schema: {
        description: 'Get all procedures',
        tags: ['procedures'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: ['string', 'null'] },
                duration_minutes: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({}, 'Fetching procedures');

      try {
        const procedureList = await app.db
          .select({
            id: schema.procedures.id,
            name: schema.procedures.name,
            description: schema.procedures.description,
            durationMinutes: schema.procedures.durationMinutes,
          })
          .from(schema.procedures);

        app.logger.info({ count: procedureList.length }, 'Procedures fetched successfully');

        return procedureList.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          duration_minutes: p.durationMinutes,
        }));
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch procedures');
        throw error;
      }
    }
  );
}
