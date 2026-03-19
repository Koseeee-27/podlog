import type { ZodType } from "zod";
import { ApiRequestError } from "@/types/api";
import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiRequestError(response.status, body.error || "Request failed");
  }
  return response.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });
  return handleResponse<T>(response);
}

/**
 * Zod スキーマ付きの GET リクエスト。
 * レスポンス JSON を Zod で parse し、実行時に型安全性を保証する。
 * parse に失敗した場合はコンソールに警告を出しつつ、元のデータをそのまま返す
 * （段階的移行のため、いきなりエラーにはしない）。
 */
export async function apiGetWithSchema<T>(
  path: string,
  schema: ZodType<T>
): Promise<T> {
  const data = await apiGet<unknown>(path);
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(
      `[apiGetWithSchema] Zod parse warning for ${path}:`,
      result.error.issues
    );
    return data as T;
  }
  return result.data;
}

/**
 * Zod スキーマ付きの POST リクエスト。
 */
export async function apiPostWithSchema<T>(
  path: string,
  schema: ZodType<T>,
  body?: unknown
): Promise<T> {
  const data = await apiPost<unknown>(path, body);
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(
      `[apiPostWithSchema] Zod parse warning for ${path}:`,
      result.error.issues
    );
    return data as T;
  }
  return result.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Content-Type は設定しない（ブラウザが multipart/form-data の boundary を自動付与する）

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiRequestError(response.status, body.error || "Request failed");
  }
}
