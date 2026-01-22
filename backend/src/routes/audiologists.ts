import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerAudiologistRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/assistants - Get all audiologists who can be assistants
  app.fastify.get(
    '/api/assistants',
    {
      schema: {
        description: 'Get all assistants (audiologists)',
        tags: ['assistants'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                full_name: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({}, 'Fetching assistants');

      try {
        const assistants = await app.db
          .select({
            id: schema.audiologists.id,
            fullName: schema.user.name,
          })
          .from(schema.audiologists)
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.audiologists.isActive, true));

        app.logger.info({ count: assistants.length }, 'Assistants fetched successfully');

        return assistants.map((a) => ({
          id: a.id,
          full_name: a.fullName,
        }));
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch assistants');
        throw error;
      }
    }
  );

  // GET /api/audiologists - Get all audiologists with optional practice_id filter
  app.fastify.get(
    '/api/audiologists',
    {
      schema: {
        description: 'Get all audiologists',
        tags: ['audiologists'],
        querystring: {
          type: 'object',
          properties: {
            practice_id: { type: 'string', description: 'Filter by practice ID' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                full_name: { type: 'string' },
                specialization: { type: ['string', 'null'] },
                is_active: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { practice_id } = request.query as { practice_id?: string };

      app.logger.info({ practice_id }, 'Fetching audiologists');

      try {
        const whereCondition = practice_id
          ? eq(schema.audiologists.practiceId, practice_id as any)
          : undefined;

        const audiologists = await app.db
          .select({
            id: schema.audiologists.id,
            userId: schema.audiologists.userId,
            fullName: schema.user.name,
            specialization: schema.audiologists.specialization,
            isActive: schema.audiologists.isActive,
          })
          .from(schema.audiologists)
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(whereCondition);

        app.logger.info({ count: audiologists.length }, 'Audiologists fetched successfully');

        return audiologists.map((a) => ({
          id: a.id,
          user_id: a.userId,
          full_name: a.fullName,
          specialization: a.specialization,
          is_active: a.isActive,
        }));
      } catch (error) {
        app.logger.error({ err: error, practice_id }, 'Failed to fetch audiologists');
        throw error;
      }
    }
  );

  // GET /api/audiologists/:id - Get audiologist by ID
  app.fastify.get(
    '/api/audiologists/:id',
    {
      schema: {
        description: 'Get an audiologist by ID',
        tags: ['audiologists'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              full_name: { type: 'string' },
              specialization: { type: ['string', 'null'] },
              is_active: { type: 'boolean' },
              practice: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ audiologistId: id }, 'Fetching audiologist details');

      try {
        const audiologist = await app.db
          .select({
            id: schema.audiologists.id,
            userId: schema.audiologists.userId,
            fullName: schema.user.name,
            specialization: schema.audiologists.specialization,
            isActive: schema.audiologists.isActive,
            practiceId: schema.practices.id,
            practiceName: schema.practices.name,
          })
          .from(schema.audiologists)
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .innerJoin(schema.practices, eq(schema.audiologists.practiceId, schema.practices.id))
          .where(eq(schema.audiologists.id, id as any))
          .limit(1);

        if (audiologist.length === 0) {
          app.logger.warn({ audiologistId: id }, 'Audiologist not found');
          return reply.code(404).send({ error: 'Audiologist not found' });
        }

        const result = audiologist[0];

        app.logger.info({ audiologistId: id }, 'Audiologist fetched successfully');

        return {
          id: result.id,
          user_id: result.userId,
          full_name: result.fullName,
          specialization: result.specialization,
          is_active: result.isActive,
          practice: {
            id: result.practiceId,
            name: result.practiceName,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, audiologistId: id }, 'Failed to fetch audiologist');
        throw error;
      }
    }
  );
}
