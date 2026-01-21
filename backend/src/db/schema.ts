import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// Re-export user table from auth-schema for convenience
export { user } from './auth-schema.js';

// Practices table
export const practices = pgTable('practices', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audiologists table
export const audiologists = pgTable('audiologists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  practiceId: uuid('practice_id').notNull().references(() => practices.id, { onDelete: 'cascade' }),
  specialization: text('specialization'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Appointments table
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientName: text('patient_name').notNull(),
  patientEmail: text('patient_email'),
  patientPhone: text('patient_phone'),
  audiologistId: uuid('audiologist_id').notNull().references(() => audiologists.id, { onDelete: 'cascade' }),
  appointmentDate: timestamp('appointment_date').notNull(),
  durationMinutes: integer('duration_minutes').default(60).notNull(),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled', 'no-show'] }).default('scheduled').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Relations
export const practicesRelations = relations(practices, ({ many }) => ({
  audiologists: many(audiologists),
}));

export const audiologistsRelations = relations(audiologists, ({ one, many }) => ({
  user: one(user, {
    fields: [audiologists.userId],
    references: [user.id],
  }),
  practice: one(practices, {
    fields: [audiologists.practiceId],
    references: [practices.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  audiologist: one(audiologists, {
    fields: [appointments.audiologistId],
    references: [audiologists.id],
  }),
  createdByUser: one(user, {
    fields: [appointments.createdBy],
    references: [user.id],
  }),
}));
