import { useEffect, useRef, useState } from "react";
import { getRunResults, getRunStatus, startRun } from "../lib/api";
import type { ModelConfig, RunResultsResponse, RunStatusResponse } from "../types";

interface StartBenchmarkInput {
  hfApiKey: string;
  models: ModelConfig[];
  rows: Array<Record<string, string>>;
}

interface UseBenchmarkRunOptions {
  onStatus: (status: RunStatusResponse) => void;
  onCompleted: (results: RunResultsResponse) => void;
  onError: (message: string) => void;
}

export function useBenchmarkRun(options: UseBenchmarkRunOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const startBenchmark = async ({ hfApiKey, models, rows }: StartBenchmarkInput): Promise<string> => {
    setIsRunning(true);
    const started = await startRun({
      hf_api_key: hfApiKey,
      models,
      rows,
    });
    setRunId(started.run_id);

    intervalRef.current = window.setInterval(async () => {
      try {
        const status = await getRunStatus(started.run_id);
        options.onStatus(status);

        if (status.status === "completed") {
          stopPolling();
          const results = await getRunResults(started.run_id);
          setIsRunning(false);
          options.onCompleted(results);
        } else if (status.status === "failed") {
          stopPolling();
          setIsRunning(false);
          options.onError(status.error || "Benchmark run failed.");
        }
      } catch (error) {
        stopPolling();
        setIsRunning(false);
        options.onError(error instanceof Error ? error.message : "Failed to poll benchmark status.");
      }
    }, 1000);

    return started.run_id;
  };

  return {
    isRunning,
    runId,
    setRunId,
    startBenchmark,
    stopPolling,
  };
}
