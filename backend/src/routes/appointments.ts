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
            clientId: schema.clients.id,
            clientName: schema.clients.name,
            clientEmail: schema.clients.email,
            clientPhone: schema.clients.phone,
            branchId: schema.branches.id,
            branchName: schema.branches.name,
            branchAddress: schema.branches.address,
            procedureId: schema.procedures.id,
            procedureName: schema.procedures.name,
            procedureDuration: schema.procedures.durationMinutes,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            assistantId: schema.appointments.assistantId,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            sendReminders: schema.appointments.sendReminders,
            isRecurring: schema.appointments.isRecurring,
            recurrencePattern: schema.appointments.recurrencePattern,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.clients, eq(schema.appointments.clientId, schema.clients.id))
          .innerJoin(schema.branches, eq(schema.appointments.branchId, schema.branches.id))
          .innerJoin(schema.procedures, eq(schema.appointments.procedureId, schema.procedures.id))
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(whereCondition);

        app.logger.info({ count: appointments.length }, 'Appointments fetched successfully');

        // Fetch assistant details if needed
        const appointmentIds = appointments.map((a) => a.id);
        let assistantMap: Map<string, { id: string; fullName: string }> = new Map();

        if (appointmentIds.length > 0) {
          const assistantAppointments = appointments.filter((a) => a.assistantId);
          if (assistantAppointments.length > 0) {
            const assistantIds = [...new Set(assistantAppointments.map((a) => a.assistantId))];
            const assistants = await app.db
              .select({
                id: schema.audiologists.id,
                fullName: schema.user.name,
              })
              .from(schema.audiologists)
              .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
              .where(inArray(schema.audiologists.id, assistantIds as any));

            assistants.forEach((a) => {
              assistantMap.set(a.id, { id: a.id, fullName: a.fullName });
            });
          }
        }

        return appointments.map((a) => {
          const result: any = {
            id: a.id,
            client: {
              id: a.clientId,
              name: a.clientName,
              email: a.clientEmail,
              phone: a.clientPhone,
            },
            branch: {
              id: a.branchId,
              name: a.branchName,
              address: a.branchAddress,
            },
            procedure: {
              id: a.procedureId,
              name: a.procedureName,
              duration_minutes: a.procedureDuration,
            },
            audiologist: {
              id: a.audiologistId,
              full_name: a.audiologistName,
            },
            appointment_date: a.appointmentDate?.toISOString() || null,
            duration_minutes: a.durationMinutes,
            status: a.status,
            send_reminders: a.sendReminders,
            is_recurring: a.isRecurring,
            recurrence_pattern: a.recurrencePattern,
            notes: a.notes,
            created_at: a.createdAt?.toISOString() || null,
          };

          if (a.assistantId && assistantMap.has(a.assistantId)) {
            const assistant = assistantMap.get(a.assistantId)!;
            result.assistant = {
              id: assistant.id,
              full_name: assistant.fullName,
            };
          }

          return result;
        });
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
            clientId: schema.clients.id,
            clientName: schema.clients.name,
            clientEmail: schema.clients.email,
            clientPhone: schema.clients.phone,
            branchId: schema.branches.id,
            branchName: schema.branches.name,
            branchAddress: schema.branches.address,
            procedureId: schema.procedures.id,
            procedureName: schema.procedures.name,
            procedureDuration: schema.procedures.durationMinutes,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            assistantId: schema.appointments.assistantId,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            sendReminders: schema.appointments.sendReminders,
            isRecurring: schema.appointments.isRecurring,
            recurrencePattern: schema.appointments.recurrencePattern,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.clients, eq(schema.appointments.clientId, schema.clients.id))
          .innerJoin(schema.branches, eq(schema.appointments.branchId, schema.branches.id))
          .innerJoin(schema.procedures, eq(schema.appointments.procedureId, schema.procedures.id))
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.appointments.id, id as any))
          .limit(1);

        if (appointment.length === 0) {
          app.logger.warn({ appointmentId: id }, 'Appointment not found');
          return reply.code(404).send({ error: 'Appointment not found' });
        }

        const a = appointment[0];

        let assistantName: string | undefined = undefined;
        if (a.assistantId) {
          const assistant = await app.db
            .select({
              fullName: schema.user.name,
            })
            .from(schema.audiologists)
            .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
            .where(eq(schema.audiologists.id, a.assistantId))
            .limit(1);

          if (assistant.length > 0) {
            assistantName = assistant[0].fullName;
          }
        }

        app.logger.info({ appointmentId: id }, 'Appointment fetched successfully');

        const result: any = {
          id: a.id,
          client: {
            id: a.clientId,
            name: a.clientName,
            email: a.clientEmail,
            phone: a.clientPhone,
          },
          branch: {
            id: a.branchId,
            name: a.branchName,
            address: a.branchAddress,
          },
          procedure: {
            id: a.procedureId,
            name: a.procedureName,
            duration_minutes: a.procedureDuration,
          },
          audiologist: {
            id: a.audiologistId,
            full_name: a.audiologistName,
          },
          appointment_date: a.appointmentDate?.toISOString() || null,
          duration_minutes: a.durationMinutes,
          status: a.status,
          send_reminders: a.sendReminders,
          is_recurring: a.isRecurring,
          recurrence_pattern: a.recurrencePattern,
          notes: a.notes,
          created_at: a.createdAt?.toISOString() || null,
        };

        if (a.assistantId && assistantName) {
          result.assistant = {
            id: a.assistantId,
            full_name: assistantName,
          };
        }

        return result;
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
          required: [
            'client_id',
            'branch_id',
            'procedure_id',
            'audiologist_id',
            'appointment_date',
            'duration_minutes',
            'send_reminders',
            'is_recurring',
          ],
          properties: {
            client_id: { type: 'string' },
            branch_id: { type: 'string' },
            procedure_id: { type: 'string' },
            audiologist_id: { type: 'string' },
            assistant_id: { type: ['string', 'null'] },
            appointment_date: { type: 'string' },
            duration_minutes: { type: 'integer' },
            send_reminders: { type: 'boolean' },
            is_recurring: { type: 'boolean' },
            recurrence_pattern: { type: ['string', 'null'] },
            notes: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const {
        client_id,
        branch_id,
        procedure_id,
        audiologist_id,
        assistant_id,
        appointment_date,
        duration_minutes,
        send_reminders,
        is_recurring,
        recurrence_pattern,
        notes,
      } = request.body as {
        client_id: string;
        branch_id: string;
        procedure_id: string;
        audiologist_id: string;
        assistant_id?: string | null;
        appointment_date: string;
        duration_minutes: number;
        send_reminders: boolean;
        is_recurring: boolean;
        recurrence_pattern?: string | null;
        notes?: string | null;
      };

      app.logger.info(
        { client_id, branch_id, procedure_id, audiologist_id, appointment_date },
        'Creating appointment'
      );

      try {
        // Verify all foreign keys exist
        const [clientExists, branchExists, procedureExists, audiologistExists] =
          await Promise.all([
            app.db
              .select({ id: schema.clients.id })
              .from(schema.clients)
              .where(eq(schema.clients.id, client_id as any))
              .limit(1),
            app.db
              .select({ id: schema.branches.id })
              .from(schema.branches)
              .where(eq(schema.branches.id, branch_id as any))
              .limit(1),
            app.db
              .select({ id: schema.procedures.id })
              .from(schema.procedures)
              .where(eq(schema.procedures.id, procedure_id as any))
              .limit(1),
            app.db
              .select({ id: schema.audiologists.id })
              .from(schema.audiologists)
              .where(eq(schema.audiologists.id, audiologist_id as any))
              .limit(1),
          ]);

        if (!clientExists.length) {
          app.logger.warn({ client_id }, 'Client not found');
          return reply.code(404).send({ error: 'Client not found' });
        }
        if (!branchExists.length) {
          app.logger.warn({ branch_id }, 'Branch not found');
          return reply.code(404).send({ error: 'Branch not found' });
        }
        if (!procedureExists.length) {
          app.logger.warn({ procedure_id }, 'Procedure not found');
          return reply.code(404).send({ error: 'Procedure not found' });
        }
        if (!audiologistExists.length) {
          app.logger.warn({ audiologist_id }, 'Audiologist not found');
          return reply.code(404).send({ error: 'Audiologist not found' });
        }

        // Verify assistant if provided
        if (assistant_id) {
          const assistantExists = await app.db
            .select({ id: schema.audiologists.id })
            .from(schema.audiologists)
            .where(eq(schema.audiologists.id, assistant_id as any))
            .limit(1);

          if (!assistantExists.length) {
            app.logger.warn({ assistant_id }, 'Assistant not found');
            return reply.code(404).send({ error: 'Assistant not found' });
          }
        }

        // Create appointment
        const [newAppointment] = await app.db
          .insert(schema.appointments)
          .values({
            clientId: client_id as any,
            branchId: branch_id as any,
            procedureId: procedure_id as any,
            audiologistId: audiologist_id as any,
            assistantId: assistant_id ? (assistant_id as any) : null,
            appointmentDate: new Date(appointment_date),
            durationMinutes: duration_minutes,
            status: 'scheduled',
            sendReminders: send_reminders,
            isRecurring: is_recurring,
            recurrencePattern: recurrence_pattern || null,
            notes: notes || null,
            createdBy: session.user.id,
          })
          .returning();

        // Fetch full appointment details
        const result = await app.db
          .select({
            id: schema.appointments.id,
            clientId: schema.clients.id,
            clientName: schema.clients.name,
            clientEmail: schema.clients.email,
            clientPhone: schema.clients.phone,
            branchId: schema.branches.id,
            branchName: schema.branches.name,
            branchAddress: schema.branches.address,
            procedureId: schema.procedures.id,
            procedureName: schema.procedures.name,
            procedureDuration: schema.procedures.durationMinutes,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            assistantId: schema.appointments.assistantId,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            sendReminders: schema.appointments.sendReminders,
            isRecurring: schema.appointments.isRecurring,
            recurrencePattern: schema.appointments.recurrencePattern,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.clients, eq(schema.appointments.clientId, schema.clients.id))
          .innerJoin(schema.branches, eq(schema.appointments.branchId, schema.branches.id))
          .innerJoin(schema.procedures, eq(schema.appointments.procedureId, schema.procedures.id))
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.appointments.id, newAppointment.id))
          .limit(1);

        if (result.length === 0) {
          throw new Error('Failed to retrieve created appointment');
        }

        const a = result[0];

        let assistantName: string | undefined = undefined;
        if (a.assistantId) {
          const assistant = await app.db
            .select({
              fullName: schema.user.name,
            })
            .from(schema.audiologists)
            .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
            .where(eq(schema.audiologists.id, a.assistantId))
            .limit(1);

          if (assistant.length > 0) {
            assistantName = assistant[0].fullName;
          }
        }

        app.logger.info({ appointmentId: newAppointment.id }, 'Appointment created successfully');

        reply.code(201);

        const responseData: any = {
          id: a.id,
          client: {
            id: a.clientId,
            name: a.clientName,
            email: a.clientEmail,
            phone: a.clientPhone,
          },
          branch: {
            id: a.branchId,
            name: a.branchName,
            address: a.branchAddress,
          },
          procedure: {
            id: a.procedureId,
            name: a.procedureName,
            duration_minutes: a.procedureDuration,
          },
          audiologist: {
            id: a.audiologistId,
            full_name: a.audiologistName,
          },
          appointment_date: a.appointmentDate?.toISOString() || null,
          duration_minutes: a.durationMinutes,
          status: a.status,
          send_reminders: a.sendReminders,
          is_recurring: a.isRecurring,
          recurrence_pattern: a.recurrencePattern,
          notes: a.notes,
          created_at: a.createdAt?.toISOString() || null,
        };

        if (a.assistantId && assistantName) {
          responseData.assistant = {
            id: a.assistantId,
            full_name: assistantName,
          };
        }

        return responseData;
      } catch (error) {
        app.logger.error(
          {
            err: error,
            client_id,
            branch_id,
            procedure_id,
            audiologist_id,
            appointment_date,
          },
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
            client_id: { type: 'string' },
            branch_id: { type: 'string' },
            procedure_id: { type: 'string' },
            audiologist_id: { type: 'string' },
            assistant_id: { type: ['string', 'null'] },
            appointment_date: { type: 'string' },
            duration_minutes: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
            },
            send_reminders: { type: 'boolean' },
            is_recurring: { type: 'boolean' },
            recurrence_pattern: { type: ['string', 'null'] },
            notes: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const {
        client_id,
        branch_id,
        procedure_id,
        audiologist_id,
        assistant_id,
        appointment_date,
        duration_minutes,
        status,
        send_reminders,
        is_recurring,
        recurrence_pattern,
        notes,
      } = request.body as {
        client_id?: string;
        branch_id?: string;
        procedure_id?: string;
        audiologist_id?: string;
        assistant_id?: string | null;
        appointment_date?: string;
        duration_minutes?: number;
        status?: string;
        send_reminders?: boolean;
        is_recurring?: boolean;
        recurrence_pattern?: string | null;
        notes?: string | null;
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

        // Verify foreign keys if provided
        if (client_id) {
          const clientExists = await app.db
            .select({ id: schema.clients.id })
            .from(schema.clients)
            .where(eq(schema.clients.id, client_id as any))
            .limit(1);
          if (!clientExists.length) {
            app.logger.warn({ client_id }, 'Client not found');
            return reply.code(404).send({ error: 'Client not found' });
          }
        }

        if (branch_id) {
          const branchExists = await app.db
            .select({ id: schema.branches.id })
            .from(schema.branches)
            .where(eq(schema.branches.id, branch_id as any))
            .limit(1);
          if (!branchExists.length) {
            app.logger.warn({ branch_id }, 'Branch not found');
            return reply.code(404).send({ error: 'Branch not found' });
          }
        }

        if (procedure_id) {
          const procedureExists = await app.db
            .select({ id: schema.procedures.id })
            .from(schema.procedures)
            .where(eq(schema.procedures.id, procedure_id as any))
            .limit(1);
          if (!procedureExists.length) {
            app.logger.warn({ procedure_id }, 'Procedure not found');
            return reply.code(404).send({ error: 'Procedure not found' });
          }
        }

        if (audiologist_id) {
          const audiologistExists = await app.db
            .select({ id: schema.audiologists.id })
            .from(schema.audiologists)
            .where(eq(schema.audiologists.id, audiologist_id as any))
            .limit(1);
          if (!audiologistExists.length) {
            app.logger.warn({ audiologist_id }, 'Audiologist not found');
            return reply.code(404).send({ error: 'Audiologist not found' });
          }
        }

        if (assistant_id) {
          const assistantExists = await app.db
            .select({ id: schema.audiologists.id })
            .from(schema.audiologists)
            .where(eq(schema.audiologists.id, assistant_id as any))
            .limit(1);
          if (!assistantExists.length) {
            app.logger.warn({ assistant_id }, 'Assistant not found');
            return reply.code(404).send({ error: 'Assistant not found' });
          }
        }

        // Prepare update data
        const updateData: any = {};

        if (client_id !== undefined) updateData.clientId = client_id as any;
        if (branch_id !== undefined) updateData.branchId = branch_id as any;
        if (procedure_id !== undefined) updateData.procedureId = procedure_id as any;
        if (audiologist_id !== undefined) updateData.audiologistId = audiologist_id as any;
        if (assistant_id !== undefined) updateData.assistantId = assistant_id ? (assistant_id as any) : null;
        if (appointment_date !== undefined) updateData.appointmentDate = new Date(appointment_date);
        if (duration_minutes !== undefined) updateData.durationMinutes = duration_minutes;
        if (status !== undefined) updateData.status = status;
        if (send_reminders !== undefined) updateData.sendReminders = send_reminders;
        if (is_recurring !== undefined) updateData.isRecurring = is_recurring;
        if (recurrence_pattern !== undefined) updateData.recurrencePattern = recurrence_pattern;
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
            clientId: schema.clients.id,
            clientName: schema.clients.name,
            clientEmail: schema.clients.email,
            clientPhone: schema.clients.phone,
            branchId: schema.branches.id,
            branchName: schema.branches.name,
            branchAddress: schema.branches.address,
            procedureId: schema.procedures.id,
            procedureName: schema.procedures.name,
            procedureDuration: schema.procedures.durationMinutes,
            audiologistId: schema.audiologists.id,
            audiologistName: schema.user.name,
            assistantId: schema.appointments.assistantId,
            appointmentDate: schema.appointments.appointmentDate,
            durationMinutes: schema.appointments.durationMinutes,
            status: schema.appointments.status,
            sendReminders: schema.appointments.sendReminders,
            isRecurring: schema.appointments.isRecurring,
            recurrencePattern: schema.appointments.recurrencePattern,
            notes: schema.appointments.notes,
            createdAt: schema.appointments.createdAt,
          })
          .from(schema.appointments)
          .innerJoin(schema.clients, eq(schema.appointments.clientId, schema.clients.id))
          .innerJoin(schema.branches, eq(schema.appointments.branchId, schema.branches.id))
          .innerJoin(schema.procedures, eq(schema.appointments.procedureId, schema.procedures.id))
          .innerJoin(schema.audiologists, eq(schema.appointments.audiologistId, schema.audiologists.id))
          .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
          .where(eq(schema.appointments.id, id as any))
          .limit(1);

        if (result.length === 0) {
          throw new Error('Failed to retrieve updated appointment');
        }

        const a = result[0];

        let assistantName: string | undefined = undefined;
        if (a.assistantId) {
          const assistant = await app.db
            .select({
              fullName: schema.user.name,
            })
            .from(schema.audiologists)
            .innerJoin(schema.user, eq(schema.audiologists.userId, schema.user.id))
            .where(eq(schema.audiologists.id, a.assistantId))
            .limit(1);

          if (assistant.length > 0) {
            assistantName = assistant[0].fullName;
          }
        }

        app.logger.info({ appointmentId: id }, 'Appointment updated successfully');

        const responseData: any = {
          id: a.id,
          client: {
            id: a.clientId,
            name: a.clientName,
            email: a.clientEmail,
            phone: a.clientPhone,
          },
          branch: {
            id: a.branchId,
            name: a.branchName,
            address: a.branchAddress,
          },
          procedure: {
            id: a.procedureId,
            name: a.procedureName,
            duration_minutes: a.procedureDuration,
          },
          audiologist: {
            id: a.audiologistId,
            full_name: a.audiologistName,
          },
          appointment_date: a.appointmentDate?.toISOString() || null,
          duration_minutes: a.durationMinutes,
          status: a.status,
          send_reminders: a.sendReminders,
          is_recurring: a.isRecurring,
          recurrence_pattern: a.recurrencePattern,
          notes: a.notes,
          created_at: a.createdAt?.toISOString() || null,
        };

        if (a.assistantId && assistantName) {
          responseData.assistant = {
            id: a.assistantId,
            full_name: assistantName,
          };
        }

        return responseData;
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
