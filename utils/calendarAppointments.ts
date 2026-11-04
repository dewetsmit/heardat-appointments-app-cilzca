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
  for (let depth = 0; depth < 6 && typeof data === 'string'; depth++) {
    try {
      data = JSON.parse(data);
    } catch {
      throw new Error('The appointments service returned an invalid response. Please try again.');
    }
  }
  if (Array.isArray(data)) return { appointments: data };
  const hasCollection = data && typeof data === 'object' &&
    ['appointments', 'assistants', 'assistant', 'assistantAppointments', 'appointmentsAsAssistant']
      .some(key => Array.isArray(data[key]));
  if (!hasCollection) {
    throw new Error('The appointments service did not return an appointment list. Please try again.');
  }
  return data;
};

const requestAppointments = async (
  request: (params: Record<string, string>) => Promise<any>,
  params: Record<string, string>
) => {
  try {
    return parseAppointmentResponse(await request(params));
  } catch (error) {
    if (error instanceof Error && error.message === 'Session Expired') throw error;
    const stage = params.AppointmentID ? 'appointment details' : 'calendar list';
    const message = error instanceof Error ? error.message : 'Please try again.';
    throw new Error(`Could not load ${stage}. ${message}`);
  }
};

export const fetchCalendarAppointmentsForUsers = async (
  request: (params: Record<string, string>) => Promise<any>,
  params: Record<string, string>,
  userIds: string[]
): Promise<Record<string, { appointments: any[]; assistants: any[] }>> => {
  // Use the supported user-scoped list request. Omitting the branch and user
  // filters can return a JSON-encoded error string instead of appointments.
  const selectedUserIds = [...new Set(userIds.map(String))];
  const recordsById = new Map<string, any>();
  const assistantMembership = new Map<string, Set<string>>();
  const identity = (record: any) => JSON.stringify([
    String(record.AppointmentID), record.DateAppointment, String(record.UserIDAssigned),
  ]);
  for (let offset = 0; offset < selectedUserIds.length; offset += 6) {
    const lists = await Promise.all(selectedUserIds.slice(offset, offset + 6).map(async userId => ({
      userId,
      list: await requestAppointments(request, {
        ...params,
        BranchID: params.BranchID || '0',
        UserIDAssigned: userId,
      }),
    })));
    for (const { userId, list } of lists) {
      const assistants = list.assistants ?? list.assistant ??
        list.assistantAppointments ?? list.appointmentsAsAssistant;
      const assignedAsAssistant: any[] = Array.isArray(assistants) ? assistants : [];
      assistantMembership.set(userId, new Set(assignedAsAssistant.map(identity)));
      for (const record of [...(list.appointments || []), ...assignedAsAssistant]) {
        recordsById.set(identity(record), record);
      }
    }
  }
  const records = [...recordsById.values()];
  const hydrated: any[] = [];
  // Limit concurrent detail requests when a month contains many appointments.
  for (let offset = 0; offset < records.length; offset += 6) {
    hydrated.push(...await Promise.all(records.slice(offset, offset + 6).map(async record => {
      if (!record.AppointmentID || record.BranchID == null || record.UserIDAssigned == null) {
        throw new Error('Appointment assignment details are missing their lookup context.');
      }
      const detail = await requestAppointments(request, {
        ...params,
        AppointmentID: String(record.AppointmentID),
        BranchID: String(record.BranchID),
        UserIDAssigned: String(record.UserIDAssigned),
      });
      const match = detail?.appointments?.find((item: any) =>
        String(item.AppointmentID) === String(record.AppointmentID) &&
        item.DateAppointment === record.DateAppointment
      );
      if (!match) throw new Error('Could not load appointment assistant assignments.');
      return { ...record, ...match };
    })));
  }
  return Object.fromEntries(selectedUserIds.map(id => {
    const userId = String(id);
    return [userId, {
      appointments: hydrated.filter(appointment => String(appointment.UserIDAssigned) === userId),
      assistants: hydrated.filter(appointment =>
        String(appointment.UserIDAssigned) !== userId &&
        (assistantMembership.get(userId)?.has(identity(appointment)) ||
          getAssistantIds([appointment.AssistantList, appointment.UserIDAssignedAssistant]).includes(userId))
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
