const KEY = 'agrismart_token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': body instanceof Blob ? body.type : 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error(navigator.onLine ? 'Server unreachable' : "You're offline"), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    // A 5xx with no JSON body usually means the dev proxy could not reach the API at all.
    const unreachable = res.status >= 500 && !data.error;
    const message = unreachable ? "The server isn't responding. Check that the API is running and connected to MongoDB." : data.error || 'Request failed';
    throw Object.assign(new Error(data.detail ? `${message} (${data.detail})` : message), { status: res.status, details: data.details });
  }
  return data;
}
