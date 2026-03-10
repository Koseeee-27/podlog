import { apiGet, apiPost, apiDelete } from "./client";
import type { ListeningRecord, ListeningStatus, ListeningRecordListResult } from "@/types/listening-record";

export function addListeningRecord(episodeId: string): Promise<ListeningRecord> {
  return apiPost<ListeningRecord>(`/episodes/${encodeURIComponent(episodeId)}/listen`);
}

export function removeListeningRecord(episodeId: string): Promise<void> {
  return apiDelete(`/episodes/${encodeURIComponent(episodeId)}/listen`);
}

export function getListeningStatus(episodeId: string): Promise<ListeningStatus> {
  return apiGet<ListeningStatus>(`/episodes/${encodeURIComponent(episodeId)}/listen`);
}

export function getMyListeningRecords(
  params?: { limit?: number; offset?: number }
): Promise<ListeningRecordListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<ListeningRecordListResult>(
    `/users/me/listening-records${query ? `?${query}` : ""}`
  );
}
