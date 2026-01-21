
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

export interface Appointment {
  id: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  audiologist: {
    id: string;
    full_name: string;
  };
  appointment_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
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
