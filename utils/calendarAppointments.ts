import { getAssistantIds } from './assistants';

interface AppointmentAssignment {
  AppointmentID?: string | number;
  DateAppointment?: string;
  UserIDAssigned?: string | number;
  AssistantList?: unknown;
  UserIDAssignedAssistant?: unknown;
}

const parseAppointmentResponse = (response: any): any => {
  let data = response;
  for (let depth = 0; depth < 3 && typeof data === 'string'; depth++) {
    data = JSON.parse(data);
  }
  return Array.isArray(data) ? { appointments: data } : data;
};

export const fetchCalendarAppointmentsForUsers = async (
  request: (params: Record<string, string>) => Promise<any>,
  params: Record<string, string>,
  userIds: string[]
): Promise<Record<string, { appointments: any[]; assistants: any[] }>> => {
  // The company/date list includes meetings whose examiner is not selected.
  // Its AssistantList is null even when the detail endpoint has assignments.
  const listParams = { ...params };
  delete listParams.UserIDAssigned;
  delete listParams.BranchID;
  const list = parseAppointmentResponse(await request(listParams));
  const records: any[] = Array.isArray(list?.appointments) ? list.appointments : [];
  const hydrated: any[] = [];
  // Limit concurrent detail requests when a month contains many appointments.
  for (let offset = 0; offset < records.length; offset += 6) {
    hydrated.push(...await Promise.all(records.slice(offset, offset + 6).map(async record => {
      if (!record.AppointmentID || record.BranchID == null || record.UserIDAssigned == null) {
        throw new Error('Appointment assignment details are missing their lookup context.');
      }
      const detail = parseAppointmentResponse(await request({
        ...params,
        AppointmentID: String(record.AppointmentID),
        BranchID: String(record.BranchID),
        UserIDAssigned: String(record.UserIDAssigned),
      }));
      const match = detail?.appointments?.find((item: any) =>
        String(item.AppointmentID) === String(record.AppointmentID) &&
        item.DateAppointment === record.DateAppointment
      );
      if (!match) throw new Error('Could not load appointment assistant assignments.');
      return { ...record, ...match };
    })));
  }
  return Object.fromEntries(userIds.map(id => {
    const userId = String(id);
    return [userId, {
      appointments: hydrated.filter(appointment => String(appointment.UserIDAssigned) === userId),
      assistants: hydrated.filter(appointment =>
        String(appointment.UserIDAssigned) !== userId &&
        getAssistantIds([appointment.AssistantList, appointment.UserIDAssignedAssistant]).includes(userId)
      ),
    }];
  }));
};

export const fetchUserCalendarAppointments = async (
  request: (params: Record<string, string>) => Promise<any>,
  params: Record<string, string>
) => {
  const userId = params.UserIDAssigned;
  const result = await fetchCalendarAppointmentsForUsers(request, params, [userId]);
  return result[userId];
};

export const getUserCalendarAppointments = <T extends AppointmentAssignment>(
  data: {
    appointments?: T[];
    assistants?: T[];
    assistant?: T[];
    assistantAppointments?: T[];
    appointmentsAsAssistant?: T[];
  } | null | undefined,
  userId: string
): (T & { calendarRole: 'Practitioner' | 'Assistant' })[] => {
  // This response was fetched for userId. Its assistant collection establishes
  // membership; UserIDAssignedAssistant can still name only the first assistant
  // on a meeting shared with several staff members.
  const assistants = data?.assistants ?? data?.assistant ??
    data?.assistantAppointments ?? data?.appointmentsAsAssistant;
  const appointments = [
    ...(Array.isArray(assistants) ? assistants : []).map(appointment => ({
      ...appointment,
      calendarRole: 'Assistant' as const,
    })),
    ...(Array.isArray(data?.appointments) ? data.appointments : []).map(appointment => ({
      ...appointment,
      calendarRole: getAssistantIds([
        appointment.AssistantList, appointment.UserIDAssignedAssistant,
      ]).includes(String(userId)) && String(appointment.UserIDAssigned) !== String(userId)
        ? 'Assistant' as const : 'Practitioner' as const,
    })),
  ];

  // A record may appear in both collections with different assistant metadata.
  // Keep the assistant role when both represent the same appointment.
  const seen = new Set<string>();
  return appointments.filter(appointment => {
    if (!appointment.AppointmentID) return true;
    const identity = JSON.stringify([
      appointment.AppointmentID, appointment.DateAppointment, appointment.UserIDAssigned,
    ]);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};
