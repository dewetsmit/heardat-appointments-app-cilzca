import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray, gte, lte, count } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerDashboardRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/dashboard/stats - Get dashboard statistics
  app.fastify.get(
    '/api/dashboard/stats',
    {
      schema: {
        description: 'Get dashboard statistics',
        tags: ['dashboard'],
        querystring: {
          type: 'object',
          properties: {
            audiologist_ids: {
              type: 'string',
              description: 'Comma-separated audiologist IDs',
            },
            start_date: { type: 'string', description: 'ISO date string' },
            end_date: { type: 'string', description: 'ISO date string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              total_appointments: { type: 'integer' },
              scheduled: { type: 'integer' },
              completed: { type: 'integer' },
              cancelled: { type: 'integer' },
              upcoming_today: { type: 'integer' },
              upcoming_week: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { audiologist_ids, start_date, end_date } = request.query as {
        audiologist_ids?: string;
        start_date?: string;
        end_date?: string;
      };

      app.logger.info(
        { audiologist_ids, start_date, end_date },
        'Fetching dashboard statistics'
      );

      try {
        // Build base conditions
        const conditions: any[] = [];

        if (audiologist_ids) {
          const ids = audiologist_ids.split(',').map((id) => id.trim() as any);
          conditions.push(inArray(schema.appointments.audiologistId, ids));
        }

        if (start_date) {
          conditions.push(gte(schema.appointments.appointmentDate, new Date(start_date)));
        }

        if (end_date) {
          conditions.push(lte(schema.appointments.appointmentDate, new Date(end_date)));
        }

        // Get base where clause
        const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total appointments
        const totalResult = await app.db
          .select({ value: count() })
          .from(schema.appointments)
          .where(baseWhere);

        const total = totalResult[0]?.value || 0;

        // Get scheduled count
        const scheduledConditions = [...conditions, eq(schema.appointments.status, 'scheduled')];
        const scheduledResult = await app.db
          .select({ value: count() })
          .from(schema.appointments)
          .where(and(...scheduledConditions));

        const scheduled = scheduledResult[0]?.value || 0;

        // Get completed count
        const completedConditions = [...conditions, eq(schema.appointments.status, 'completed')];
        const completedResult = await app.db
          .select({ value: count() })
          .from(schema.appointments)
          .where(and(...completedConditions));

        const completed = completedResult[0]?.value || 0;

        // Get cancelled count
        const cancelledConditions = [...conditions, eq(schema.appointments.status, 'cancelled')];
        const cancelledResult = await app.db
          .select({ value: count() })
          .from(schema.appointments)
          .where(and(...cancelledConditions));

        const cancelled = cancelledResult[0]?.value || 0;

        // Get upcoming today
        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const upcomingTodayConditions = [
          ...conditions,
          gte(schema.appointments.appointmentDate, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
          lte(schema.appointments.appointmentDate, todayEnd),
          eq(schema.appointments.status, 'scheduled'),
        ];
        const upcomingTodayResult = await app.db
          .select({ value: count() })
          .from(schema.appointments)
          .where(and(...upcomingTodayConditions));

        const upcomingToday = upcomingTodayResult[0]?.value || 0;

        // Get upcoming week
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);

        const upcomingWeekConditions = [
          ...conditions,
          gte(schema.appointments.appointmentDate, now),
          lte(schema.appointments.appointmentDate, weekEnd),
          eq(schema.appointments.status, 'scheduled'),
        ];
        const upcomingWeekResult = await app.db
          .select({ value: count() })
          .from(schema.appointments)
          .where(and(...upcomingWeekConditions));

        const upcomingWeek = upcomingWeekResult[0]?.value || 0;

        app.logger.info(
          {
            total_appointments: total,
            scheduled,
            completed,
            cancelled,
            upcoming_today: upcomingToday,
            upcoming_week: upcomingWeek,
          },
          'Dashboard statistics fetched successfully'
        );

        return {
          total_appointments: total,
          scheduled,
          completed,
          cancelled,
          upcoming_today: upcomingToday,
          upcoming_week: upcomingWeek,
        };
      } catch (error) {
        app.logger.error(
          { err: error, audiologist_ids, start_date, end_date },
          'Failed to fetch dashboard statistics'
        );
        throw error;
      }
    }
  );
}
