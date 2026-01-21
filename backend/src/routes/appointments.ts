import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerAppointmentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/appointments - Get appointments with filters
  app.fastify.get(
    '/api/appointments',
    {
      schema: {
        description: 'Get appointments with optional filters',
        tags: ['appointments'],
        querystring: {
          type: 'object',
          properties: {
            audiologist_ids: {
              type: 'string',
              description: 'Comma-separated audiologist IDs',
            },
            start_date: { type: 'string', description: 'ISO date string' },
            end_date: { type: 'string', description: 'ISO date string' },
            status: {
              type: 'string',
              enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
            },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                patient_name: { type: 'string' },
                patient_email: { type: ['string', 'null'] },
                patient_phone: { type: ['string', 'null'] },
                audiologist: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    full_name: { type: 'string' },
                  },
                },
                appointment_date: { type: 'string' },
                duration_minutes: { type: 'integer' },
                status: { type: 'string' },
                notes: { type: ['string', 'null'] },
                created_at: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { audiologist_ids, start_date, end_date, status } = request.query as {
        audiologist_ids?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
      };

      app.logger.info(
        { audiologist_ids, start_date, end_date, status },
        'Fetching appointments'
      );

      try {
        let conditions: any[] = [];

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

        if (status) {
          conditions.push(eq(schema.appointments.status, status as 'scheduled' | 'completed' | 'cancelled' | 'no-show'));
        }

        const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

        const appointments = await app.db
          .select({
            id: schema.appointments.id,
            patientName: schema.appointments.patientName,
            patientEmail: schema.appointments.patientEmail,
            patientPhone: schema.appointments.patientPhone,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(whereCondition);

        app.logger.info({ count: appointments.length }, 'Appointments fetched successfully');

        return appointments.map((a) => ({
          id: a.id,
          patient_name: a.patientName,
          patient_email: a.patientEmail,
          patient_phone: a.patientPhone,
          audiologist: {
            id: a.audiologistId,
            full_name: a.audiologistName,
          },
          appointment_date: a.appointmentDate?.toISOString() || null,
          duration_minutes: a.durationMinutes,
          status: a.status,
          notes: a.notes,
          created_at: a.createdAt?.toISOString() || null,
        }));
      } catch (error) {
        app.logger.error(
          { err: error, audiologist_ids, start_date, end_date, status },
          'Failed to fetch appointments'
        );
        throw error;
      }
    }
  );

  // GET /api/appointments/:id - Get appointment by ID
  app.fastify.get(
    '/api/appointments/:id',
    {
      schema: {
        description: 'Get an appointment by ID',
        tags: ['appointments'],
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
              patient_name: { type: 'string' },
              patient_email: { type: ['string', 'null'] },
              patient_phone: { type: ['string', 'null'] },
              audiologist: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  full_name: { type: 'string' },
                },
              },
              appointment_date: { type: 'string' },
              duration_minutes: { type: 'integer' },
              status: { type: 'string' },
              notes: { type: ['string', 'null'] },
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ appointmentId: id }, 'Fetching appointment details');

      try {
        const appointment = await app.db
          .select({
            id: schema.appointments.id,
            patientName: schema.appointments.patientName,
            patientEmail: schema.appointments.patientEmail,
            patientPhone: schema.appointments.patientPhone,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.appointments.id, id as any))
          .limit(1);

        if (appointment.length === 0) {
          app.logger.warn({ appointmentId: id }, 'Appointment not found');
          return reply.code(404).send({ error: 'Appointment not found' });
        }

        const result = appointment[0];

        app.logger.info({ appointmentId: id }, 'Appointment fetched successfully');

        return {
          id: result.id,
          patient_name: result.patientName,
          patient_email: result.patientEmail,
          patient_phone: result.patientPhone,
          audiologist: {
            id: result.audiologistId,
            full_name: result.audiologistName,
          },
          appointment_date: result.appointmentDate?.toISOString() || null,
          duration_minutes: result.durationMinutes,
          status: result.status,
          notes: result.notes,
          created_at: result.createdAt?.toISOString() || null,
        };
      } catch (error) {
        app.logger.error({ err: error, appointmentId: id }, 'Failed to fetch appointment');
        throw error;
      }
    }
  );

  // POST /api/appointments - Create appointment
  app.fastify.post(
    '/api/appointments',
    {
      schema: {
        description: 'Create a new appointment',
        tags: ['appointments'],
        body: {
          type: 'object',
          required: ['patient_name', 'audiologist_id', 'appointment_date'],
          properties: {
            patient_name: { type: 'string' },
            patient_email: { type: ['string', 'null'] },
            patient_phone: { type: ['string', 'null'] },
            audiologist_id: { type: 'string' },
            appointment_date: { type: 'string', description: 'ISO date string' },
            duration_minutes: { type: 'integer' },
            notes: { type: ['string', 'null'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              patient_name: { type: 'string' },
              patient_email: { type: ['string', 'null'] },
              patient_phone: { type: ['string', 'null'] },
              audiologist: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  full_name: { type: 'string' },
                },
              },
              appointment_date: { type: 'string' },
              duration_minutes: { type: 'integer' },
              status: { type: 'string' },
              notes: { type: ['string', 'null'] },
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        patient_name,
        patient_email,
        patient_phone,
        audiologist_id,
        appointment_date,
        duration_minutes,
        notes,
      } = request.body as {
        patient_name: string;
        patient_email?: string;
        patient_phone?: string;
        audiologist_id: string;
        appointment_date: string;
        duration_minutes?: number;
        notes?: string;
      };

      app.logger.info(
        { patient_name, audiologist_id, appointment_date },
        'Creating appointment'
      );

      try {
        // Verify audiologist exists
        const audiologistExists = await app.db
          .select({ id: schema.audiologists.id })
          .from(schema.audiologists)
          .where(eq(schema.audiologists.id, audiologist_id as any))
          .limit(1);

        if (audiologistExists.length === 0) {
          app.logger.warn({ audiologist_id }, 'Audiologist not found');
          return reply.code(404).send({ error: 'Audiologist not found' });
        }

        // Create appointment
        const [newAppointment] = await app.db
          .insert(schema.appointments)
          .values({
            patientName: patient_name,
            patientEmail: patient_email || null,
            patientPhone: patient_phone || null,
            audiologistId: audiologist_id as any,
            appointmentDate: new Date(appointment_date),
            durationMinutes: duration_minutes || 60,
            status: 'scheduled',
            notes: notes || null,
            createdBy: session.user.id,
          })
          .returning();

        // Fetch full appointment details with audiologist info
        const result = await app.db
          .select({
            id: schema.appointments.id,
            patientName: schema.appointments.patientName,
            patientEmail: schema.appointments.patientEmail,
            patientPhone: schema.appointments.patientPhone,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.appointments.id, newAppointment.id))
          .limit(1);

        if (result.length === 0) {
          throw new Error('Failed to retrieve created appointment');
        }

        const appointment = result[0];

        app.logger.info({ appointmentId: newAppointment.id }, 'Appointment created successfully');

        reply.code(201);
        return {
          id: appointment.id,
          patient_name: appointment.patientName,
          patient_email: appointment.patientEmail,
          patient_phone: appointment.patientPhone,
          audiologist: {
            id: appointment.audiologistId,
            full_name: appointment.audiologistName,
          },
          appointment_date: appointment.appointmentDate?.toISOString() || null,
          duration_minutes: appointment.durationMinutes,
          status: appointment.status,
          notes: appointment.notes,
          created_at: appointment.createdAt?.toISOString() || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, patient_name, audiologist_id, appointment_date },
          'Failed to create appointment'
        );
        throw error;
      }
    }
  );

  // PUT /api/appointments/:id - Update appointment
  app.fastify.put(
    '/api/appointments/:id',
    {
      schema: {
        description: 'Update an appointment',
        tags: ['appointments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            patient_name: { type: 'string' },
            patient_email: { type: ['string', 'null'] },
            patient_phone: { type: ['string', 'null'] },
            audiologist_id: { type: 'string' },
            appointment_date: { type: 'string' },
            duration_minutes: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
            },
            notes: { type: ['string', 'null'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              patient_name: { type: 'string' },
              patient_email: { type: ['string', 'null'] },
              patient_phone: { type: ['string', 'null'] },
              audiologist: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  full_name: { type: 'string' },
                },
              },
              appointment_date: { type: 'string' },
              duration_minutes: { type: 'integer' },
              status: { type: 'string' },
              notes: { type: ['string', 'null'] },
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const {
        patient_name,
        patient_email,
        patient_phone,
        audiologist_id,
        appointment_date,
        duration_minutes,
        status,
        notes,
      } = request.body as {
        patient_name?: string;
        patient_email?: string;
        patient_phone?: string;
        audiologist_id?: string;
        appointment_date?: string;
        duration_minutes?: number;
        status?: string;
        notes?: string;
      };

      app.logger.info({ appointmentId: id }, 'Updating appointment');

      try {
        // Verify appointment exists
        const existingAppointment = await app.db
          .select({ id: schema.appointments.id })
          .from(schema.appointments)
          .where(eq(schema.appointments.id, id as any))
          .limit(1);

        if (existingAppointment.length === 0) {
          app.logger.warn({ appointmentId: id }, 'Appointment not found');
          return reply.code(404).send({ error: 'Appointment not found' });
        }

        // Verify audiologist if provided
        if (audiologist_id) {
          const audiologistExists = await app.db
            .select({ id: schema.audiologists.id })
            .from(schema.audiologists)
            .where(eq(schema.audiologists.id, audiologist_id as any))
            .limit(1);

          if (audiologistExists.length === 0) {
            app.logger.warn({ audiologist_id }, 'Audiologist not found');
            return reply.code(404).send({ error: 'Audiologist not found' });
          }
        }

        // Prepare update data
        const updateData: any = {};

        if (patient_name !== undefined) updateData.patientName = patient_name;
        if (patient_email !== undefined) updateData.patientEmail = patient_email;
        if (patient_phone !== undefined) updateData.patientPhone = patient_phone;
        if (audiologist_id !== undefined) updateData.audiologistId = audiologist_id as any;
        if (appointment_date !== undefined)
          updateData.appointmentDate = new Date(appointment_date);
        if (duration_minutes !== undefined) updateData.durationMinutes = duration_minutes;
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        // Update appointment
        await app.db
          .update(schema.appointments)
          .set(updateData)
          .where(eq(schema.appointments.id, id as any));

        // Fetch updated appointment details
        const result = await app.db
          .select({
            id: schema.appointments.id,
            patientName: schema.appointments.patientName,
            patientEmail: schema.appointments.patientEmail,
            patientPhone: schema.appointments.patientPhone,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.appointments.id, id as any))
          .limit(1);

        if (result.length === 0) {
          throw new Error('Failed to retrieve updated appointment');
        }

        const appointment = result[0];

        app.logger.info({ appointmentId: id }, 'Appointment updated successfully');

        return {
          id: appointment.id,
          patient_name: appointment.patientName,
          patient_email: appointment.patientEmail,
          patient_phone: appointment.patientPhone,
          audiologist: {
            id: appointment.audiologistId,
            full_name: appointment.audiologistName,
          },
          appointment_date: appointment.appointmentDate?.toISOString() || null,
          duration_minutes: appointment.durationMinutes,
          status: appointment.status,
          notes: appointment.notes,
          created_at: appointment.createdAt?.toISOString() || null,
        };
      } catch (error) {
        app.logger.error({ err: error, appointmentId: id }, 'Failed to update appointment');
        throw error;
      }
    }
  );

  // DELETE /api/appointments/:id - Delete appointment
  app.fastify.delete(
    '/api/appointments/:id',
    {
      schema: {
        description: 'Delete an appointment',
        tags: ['appointments'],
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
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info({ appointmentId: id }, 'Deleting appointment');

      try {
        // Verify appointment exists
        const existingAppointment = await app.db
          .select({ id: schema.appointments.id })
          .from(schema.appointments)
          .where(eq(schema.appointments.id, id as any))
          .limit(1);

        if (existingAppointment.length === 0) {
          app.logger.warn({ appointmentId: id }, 'Appointment not found');
          return reply.code(404).send({ error: 'Appointment not found' });
        }

        // Delete appointment
        await app.db
          .delete(schema.appointments)
          .where(eq(schema.appointments.id, id as any));

        app.logger.info({ appointmentId: id }, 'Appointment deleted successfully');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, appointmentId: id }, 'Failed to delete appointment');
        throw error;
      }
    }
  );
}
