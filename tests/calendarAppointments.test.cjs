const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Load these pure TypeScript helpers without booting Expo or React Native.
function loadHelper(name) {
  const filename = path.resolve(__dirname, '../utils', `${name}.ts`);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    dependency => loadHelper(dependency.replace('./', '')), module, module.exports
  );
  return module.exports;
}
const { getUserCalendarAppointments } = loadHelper('calendarAppointments');
const meeting = {
  AppointmentID: '100',
  DateAppointment: '2026-10-27T09:00:00',
  UserIDAssigned: 'examiner',
  UserIDAssignedAssistant: 'assistant1',
  AssistantList: null,
  Type: 'Meeting',
  BranchID: 'branch1',
};

test('a scoped meeting remains visible for every assistant when metadata names only the first', () => {
  for (const user of ['assistant1', 'assistant2', 'assistant3', 'assistant4']) {
    const result = getUserCalendarAppointments({ appointments: [], assistants: [meeting] }, user);
    assert.equal(result.length, 1, user);
    assert.equal(result[0].calendarRole, 'Assistant');
    assert.equal(result[0].AppointmentID, meeting.AppointmentID);
  }
  assert.equal(getUserCalendarAppointments({ appointments: [meeting] }, 'examiner')[0].calendarRole, 'Practitioner');
});

test('assistant-only responses and supported collection names retain their records', () => {
  for (const key of ['assistants', 'assistant', 'assistantAppointments', 'appointmentsAsAssistant']) {
    assert.equal(getUserCalendarAppointments({ [key]: [meeting] }, 'assistant2').length, 1, key);
  }
  assert.deepEqual(getUserCalendarAppointments(null, 'assistant2'), []);
  assert.deepEqual(getUserCalendarAppointments({ appointments: [] }, 'assistant2'), []);
});

test('duplicate records retain the assistant role despite differing assignment metadata', () => {
  const result = getUserCalendarAppointments({
    appointments: [{ ...meeting, AssistantList: 'assistant1,assistant2' }],
    assistants: [meeting],
  }, 'assistant2');
  assert.equal(result.length, 1);
  assert.equal(result[0].calendarRole, 'Assistant');
});

test('the same meeting on different dates remains visible', () => {
  const result = getUserCalendarAppointments({ assistants: [
    meeting, { ...meeting, DateAppointment: '2026-10-28T09:00:00' },
  ] }, 'assistant2');
  assert.equal(result.length, 2);
});

const { fetchCalendarAppointmentsForUsers, fetchUserCalendarAppointments } = loadHelper('calendarAppointments');
const scope = {
  UserIDAssigned: 'assistant2', BranchID: '0', Deleted: '0',
  DateAppointmentStart: '2026-10-27', DateAppointmentEnd: '2026-10-27',
};
const assignedMeeting = { ...meeting, AssistantList: 'assistant1,assistant2,assistant3,assistant4' };

test('hydrates the null list assignment using the exact appointment lookup context', async () => {
  const calls = [];
  const data = await fetchUserCalendarAppointments(async params => {
    calls.push(params);
    return JSON.stringify({ appointments: [params.AppointmentID ? assignedMeeting : meeting] });
  }, scope);
  assert.deepEqual(calls, [
    { Deleted: '0', DateAppointmentStart: scope.DateAppointmentStart, DateAppointmentEnd: scope.DateAppointmentEnd },
    { ...scope, AppointmentID: '100', BranchID: 'branch1', UserIDAssigned: 'examiner' },
  ]);
  assert.equal(getUserCalendarAppointments(data, 'assistant2').length, 1);
  assert.equal(data.assistants[0].AssistantList, assignedMeeting.AssistantList);
});

test('fetches once for all five members and puts the meeting in every assigned lane', async () => {
  let count = 0;
  const users = ['examiner', 'assistant1', 'assistant2', 'assistant3', 'assistant4', 'unassigned'];
  const result = await fetchCalendarAppointmentsForUsers(async params => {
    count++;
    return { appointments: [params.AppointmentID ? assignedMeeting : meeting] };
  }, scope, users);
  assert.equal(count, 2);
  for (const userId of users.slice(0, 5)) {
    const appointments = getUserCalendarAppointments(result[userId], userId);
    assert.equal(appointments.length, 1, userId);
    assert.equal(appointments[0].calendarRole, userId === 'examiner' ? 'Practitioner' : 'Assistant');
  }
  assert.equal(getUserCalendarAppointments(result.unassigned, 'unassigned').length, 0);
});

test('an assistant-only selection retrieves a meeting whose examiner is hidden', async () => {
  const result = await fetchCalendarAppointmentsForUsers(async params => {
    if (!params.AppointmentID) assert.equal(params.UserIDAssigned, undefined);
    return { appointments: [params.AppointmentID ? assignedMeeting : meeting] };
  }, scope, ['assistant3']);
  assert.equal(getUserCalendarAppointments(result.assistant3, 'assistant3').length, 1);
});

test('the examiner remains a practitioner when also present in AssistantList', async () => {
  const result = getUserCalendarAppointments({ appointments: [{ ...meeting, AssistantList: 'examiner,assistant1' }] }, 'examiner');
  assert.equal(result[0].calendarRole, 'Practitioner');
});

test('empty calendar needs no detail requests', async () => {
  let count = 0;
  const result = await fetchUserCalendarAppointments(async () => {
    count++;
    return { appointments: [] };
  }, scope);
  assert.equal(count, 1);
  assert.deepEqual(result, { appointments: [], assistants: [] });
});

test('missing details are reported rather than claiming no assistant assignments', async () => {
  await assert.rejects(fetchUserCalendarAppointments(async params => ({
    appointments: params.AppointmentID ? [] : [meeting],
  }), scope), /Could not load appointment assistant assignments/);
});
