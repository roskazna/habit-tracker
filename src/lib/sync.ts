import type { AiInsight, AppState, SyncEnvelope } from "../types";

const jsonHeaders = (accessKey: string) => ({
  "Content-Type": "application/json",
  "x-tracker-key": accessKey
});

export const pullRemoteState = async (accessKey: string): Promise<SyncEnvelope> => {
  const response = await fetch("/api/state", {
    method: "GET",
    headers: {
      "x-tracker-key": accessKey
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<SyncEnvelope>;
};

export const pushRemoteState = async (
  state: AppState,
  accessKey: string
): Promise<SyncEnvelope> => {
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: jsonHeaders(accessKey),
    body: JSON.stringify({ state })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<SyncEnvelope>;
};

export const requestAiInsight = async (
  state: AppState,
  accessKey: string
): Promise<AiInsight> => {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: jsonHeaders(accessKey),
    body: JSON.stringify({ state })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as { insight: AiInsight };
  return payload.insight;
};
