
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'audiologist' | 'assistant';
  practice_id?: string;
}

export interface Audiologist {
  id: string;
  user_id: string;
  full_name: string;
  specialization?: string;
  is_active: boolean;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
}

export interface Appointment {
  id: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  client?: Client;
  branch?: Branch;
  procedure?: Procedure;
  audiologist: {
    id: string;
    full_name: string;
  };
  assistant?: {
    id: string;
    full_name: string;
  };
  appointment_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  send_reminders?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  total_appointments: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  upcoming_today: number;
  upcoming_week: number;
}
