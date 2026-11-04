// Heardat can return authentication failures as plain text with HTTP 200.
const isAuthenticationError = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return /session\s+expired|invalid\s+(credentials|session)|^\s*unauthori[sz]ed\b/i.test(value);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).some(([key, message]) =>
    ['error', 'message', 'detail'].includes(key.toLowerCase()) &&
    typeof message === 'string' &&
    (isAuthenticationError(message) || (key.toLowerCase() === 'error' && /session/i.test(message)))
  );
};

export const parseHeardatResponse = async <T>(
  response: Pick<Response, 'status' | 'ok' | 'text'>,
  onSessionExpired: () => void
): Promise<T> => {
  const expireSession = (): never => {
    onSessionExpired();
    throw new Error('Session Expired');
  };
  if (response.status === 401) expireSession();

  const text = (await response.text()).trim();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    if (isAuthenticationError(text)) expireSession();
    if (!response.ok) throw new Error(`Heardat API error: ${response.status}`);
    throw new Error('Heardat returned an invalid response. Please try again.');
  }

  // Inspect double-encoded payloads too, preserving the API's response shape.
  let payload = data;
  for (let depth = 0; depth < 6; depth++) {
    if (isAuthenticationError(payload)) expireSession();
    if (typeof payload !== 'string') break;
    try {
      payload = JSON.parse(payload);
    } catch {
      break;
    }
  }
  if (!response.ok) throw new Error(`Heardat API error: ${response.status}`);
  return data as T;
};
