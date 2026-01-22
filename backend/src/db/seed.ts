import { createApplication } from "@specific-dev/framework";
import * as appSchema from './schema.js';
import * as authSchema from './auth-schema.js';
import { eq } from 'drizzle-orm';

// Combine schemas
const schema = { ...appSchema, ...authSchema };

// Create app instance for database access
export const app = await createApplication(schema);

async function seed() {
  console.log('Starting seed...');

  try {
    // Get or create a default practice
    let practices = await app.db.select({ id: appSchema.practices.id }).from(appSchema.practices).limit(1);
    let practiceId: string;

    if (practices.length === 0) {
      const [newPractice] = await app.db
        .insert(appSchema.practices)
        .values({
          name: 'Heardat Clinic',
          address: '123 Main St, Springfield, IL',
          phone: '+1-555-0100',
        })
        .returning();
      practiceId = newPractice.id;
      console.log('Created practice:', practiceId);
    } else {
      practiceId = practices[0].id;
      console.log('Using existing practice:', practiceId);
    }

    // Create sample clients
    const existingClients = await app.db.select({ id: appSchema.clients.id }).from(appSchema.clients);
    if (existingClients.length === 0) {
      const clientData = [
        { name: 'John Doe', email: 'john@example.com', phone: '+1-555-0101' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '+1-555-0102' },
        { name: 'Robert Johnson', email: 'robert@example.com', phone: '+1-555-0103' },
        { name: 'Emily Davis', email: 'emily@example.com', phone: '+1-555-0104' },
        { name: 'Michael Wilson', email: 'michael@example.com', phone: '+1-555-0105' },
      ];

      const clients = await app.db
        .insert(appSchema.clients)
        .values(clientData.map((c) => ({ ...c, practiceId })))
        .returning();

      console.log('Created clients:', clients.map((c) => c.id));
    } else {
      console.log('Clients already exist:', existingClients.map((c) => c.id));
    }

    // Create sample branches
    const existingBranches = await app.db.select({ id: appSchema.branches.id }).from(appSchema.branches);
    if (existingBranches.length === 0) {
      const branchData = [
        { name: 'Downtown Clinic', address: '123 Main St, Springfield, IL' },
        { name: 'Westside Clinic', address: '456 Oak Ave, Springfield, IL' },
        { name: 'Eastside Clinic', address: '789 Elm Rd, Springfield, IL' },
      ];

      const branches = await app.db
        .insert(appSchema.branches)
        .values(branchData.map((b) => ({ ...b, practiceId })))
        .returning();

      console.log('Created branches:', branches.map((b) => b.id));
    } else {
      console.log('Branches already exist:', existingBranches.map((b) => b.id));
    }

    // Create sample procedures
    const existingProcedures = await app.db.select({ id: appSchema.procedures.id }).from(appSchema.procedures);
    if (existingProcedures.length === 0) {
      const procedureData = [
        { name: 'Hearing Test', description: 'Comprehensive hearing assessment', durationMinutes: 60 },
        { name: 'Hearing Aid Fitting', description: 'Fitting and adjustment of hearing aids', durationMinutes: 90 },
        { name: 'Follow-up Consultation', description: 'Follow-up visit for hearing aid adjustments', durationMinutes: 30 },
        { name: 'Tinnitus Assessment', description: 'Evaluation and treatment of tinnitus symptoms', durationMinutes: 45 },
        { name: 'Ear Wax Removal', description: 'Safe removal of ear wax buildup', durationMinutes: 20 },
      ];

      const procedures = await app.db
        .insert(appSchema.procedures)
        .values(procedureData.map((p) => ({ ...p, practiceId })))
        .returning();

      console.log('Created procedures:', procedures.map((p) => p.id));
    } else {
      console.log('Procedures already exist:', existingProcedures.map((p) => p.id));
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

// Run seed
await seed();
process.exit(0);
