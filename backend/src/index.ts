import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAudiologistRoutes } from './routes/audiologists.js';
import { registerAppointmentRoutes } from './routes/appointments.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerClientRoutes } from './routes/clients.js';
import { registerBranchRoutes } from './routes/branches.js';
import { registerProcedureRoutes } from './routes/procedures.js';

// Combine all schemas
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable Better Auth for authentication
app.withAuth();

// Register route modules
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerAudiologistRoutes(app);
registerAppointmentRoutes(app);
registerDashboardRoutes(app);
registerClientRoutes(app);
registerBranchRoutes(app);
registerProcedureRoutes(app);

await app.run();
app.logger.info('Application running with full appointment management system');
