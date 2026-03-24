export interface ModelConfig {
  model_id: string;
  temperature: number;
  max_new_tokens: number;
  top_p: number;
}

export interface CSVData {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface RunStartResponse {
  run_id: string;
}

export interface RunStatusResponse {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  total_rows: number;
  completed_rows: number;
  current_row_label: string | null;
  error: string | null;
}

export interface RunResultsResponse {
  run_id: string;
  columns: string[];
  rows: Array<Record<string, string>>;
}
