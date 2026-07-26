const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
let csrfToken: string | null = null;

export async function getCsrfToken() {
  if (!csrfToken) {
    const res = await apiFetch("/csrf-token", {
      credentials: "include",
    });

    const data = await res.json();
    csrfToken = data.csrfToken;
  }

  return csrfToken as string;
}

export function getApiUrl(relativeUrl: string) {
  return `${API_BASE_URL}${relativeUrl}`;
}

export async function apiFetch(
  relativeUrl: string,
  options: RequestInit = {}
) {
  const method = options.method?.toUpperCase() ?? "GET";

  const headers = new Headers(options.headers);

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("CSRF-Token", await getCsrfToken());
  }

  return fetch(getApiUrl(relativeUrl), {
    ...options,
    headers,
    credentials: "include",
  });
}
