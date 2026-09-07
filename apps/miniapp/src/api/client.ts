import type { AuthTokens, ErrorEnvelope } from "@food-ai/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const ACCESS_TOKEN_KEY = "food-ai:accessToken";
const REFRESH_TOKEN_KEY = "food-ai:refreshToken";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly envelope: ErrorEnvelope | null,
  ) {
    super(envelope?.message ?? `Request failed with status ${status}`);
  }
}

let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

export function getAccessToken(): string | null {
  return accessToken;
}

export function setTokens(tokens: AuthTokens | null): void {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;

  if (tokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    setTokens(null);
    return false;
  }
  setTokens((await res.json()) as AuthTokens);
  return true;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  allowRefresh = true,
): Promise<T> {
  // FormData (photo upload) must NOT get a manual Content-Type — the browser sets its
  // own multipart boundary, which a fixed "application/json" would break.
  const isFormData = init?.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && allowRefresh && (await tryRefresh())) {
    return apiRequest<T>(path, init, false);
  }

  if (!res.ok) {
    const envelope = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new ApiError(res.status, envelope);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
