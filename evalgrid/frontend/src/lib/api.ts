import type { ModelConfig, RunResultsResponse, RunStartResponse, RunStatusResponse } from "../types";

interface StartRunPayload {
  hf_api_key: string;
  models: ModelConfig[];
  rows: Array<Record<string, string>>;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("Cannot connect to backend. Make sure the server is running on port 8000.");
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("Something went wrong on the server. Check the terminal for details.");
    }

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        throw new Error(payload.detail);
      }
    } catch {
      // handled by default message
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function healthCheck(): Promise<{ status: string }> {
  return requestJson<{ status: string }>("/api/health");
}

export async function startRun(payload: StartRunPayload): Promise<RunStartResponse> {
  return requestJson<RunStartResponse>("/api/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  return requestJson<RunStatusResponse>(`/api/run/${runId}/status`);
}

export async function getRunResults(runId: string): Promise<RunResultsResponse> {
  return requestJson<RunResultsResponse>(`/api/run/${runId}/results`);
}
