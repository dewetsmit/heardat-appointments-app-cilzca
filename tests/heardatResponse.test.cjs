const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const { outputText } = ts.transpileModule(readFileSync(require.resolve('../utils/heardatResponse.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const helper = { exports: {} };
new Function('module', 'exports', outputText)(helper, helper.exports);
const { parseHeardatResponse } = helper.exports;
const response = (body, status = 200) => ({ status, ok: status >= 200 && status < 300, text: async () => body });

test('authentication failures trigger recovery before JSON parsing', async () => {
  for (const [body, status] of [
    ['Unauthorized', 200], ['Unauthorized', 401], ['', 401],
    ['Session expired', 200], ['Invalid credentials', 200],
    [JSON.stringify('Unauthorized'), 200],
    [JSON.stringify(JSON.stringify({ Error: 'Invalid session' })), 200],
    [JSON.stringify({ message: 'Session expired' }), 403],
  ]) {
    let expired = 0;
    await assert.rejects(parseHeardatResponse(response(body, status), () => expired++), /Session Expired/);
    assert.equal(expired, 1);
  }
});

test('successful responses preserve their original shape including double encoding and null', async () => {
  for (const value of [{ appointments: [] }, [], null, JSON.stringify({ appointments: [] })]) {
    assert.deepEqual(await parseHeardatResponse(response(JSON.stringify(value)), () => assert.fail('expired')), value);
  }
});

test('malformed and server error responses provide useful errors without expiring the session', async () => {
  for (const [body, status, error] of [
    ['Unexpected server failure', 200, /invalid response/],
    ['', 200, /invalid response/], ['<html>Unavailable</html>', 503, /503/],
    ['Forbidden', 403, /403/], [JSON.stringify({ error: 'Server unavailable' }), 500, /500/],
  ]) {
    await assert.rejects(parseHeardatResponse(response(body, status), () => assert.fail('expired')), error);
  }
});

test('appointment notes containing authentication phrases do not expire the session', async () => {
  const value = { appointments: [{ Notes: 'Discuss session expired message with support' }] };
  assert.deepEqual(await parseHeardatResponse(response(JSON.stringify(value)), () => assert.fail('expired')), value);
});
