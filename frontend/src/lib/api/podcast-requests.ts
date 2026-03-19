import { apiPost } from "./client";
import type {
  CreatePodcastRequestInput,
  PodcastRequestResult,
} from "@/types/podcast-request";

export function createPodcastRequest(
  data: CreatePodcastRequestInput
): Promise<PodcastRequestResult> {
  return apiPost<PodcastRequestResult>("/podcasts/request", data);
}
