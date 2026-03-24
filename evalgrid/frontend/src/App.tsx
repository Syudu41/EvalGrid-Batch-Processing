import { useMemo, useState } from "react";
import { APIKeyInput } from "./components/APIKeyInput";
import { CSVUploader } from "./components/CSVUploader";
import { DownloadBar } from "./components/DownloadBar";
import { createDefaultModel, ModelConfigurator } from "./components/ModelConfigurator";
import { ResultsTable } from "./components/ResultsTable";
import { RunProgress } from "./components/RunProgress";
import { StepIndicator } from "./components/StepIndicator";
import { useBenchmarkRun } from "./hooks/useBenchmarkRun";
import type { CSVData, ModelConfig, RunResultsResponse, RunStatusResponse } from "./types";

export default function App() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [models, setModels] = useState<ModelConfig[]>([createDefaultModel()]);
  const [hfApiKey, setHfApiKey] = useState<string>("");
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatusResponse | null>(null);
  const [results, setResults] = useState<RunResultsResponse | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runCompletedAt, setRunCompletedAt] = useState<number | null>(null);

  const { startBenchmark, stopPolling } = useBenchmarkRun({
    onStatus: (status) => {
      setRunStatus(status);
    },
    onCompleted: (completedResults) => {
      setResults(completedResults);
      setRunCompletedAt(Date.now());
      setCurrentStep(4);
    },
    onError: (message) => {
      setGlobalError(message);
    },
  });

  const canRun = useMemo(() => {
    if (!hfApiKey.trim()) {
      return false;
    }
    if (models.length < 1 || models.length > 5) {
      return false;
    }
    return models.every(
      (model) =>
        model.model_id.trim().length > 0 &&
        model.temperature >= 0 &&
        model.temperature <= 2 &&
        model.max_new_tokens >= 1 &&
        model.max_new_tokens <= 4096 &&
        model.top_p >= 0 &&
        model.top_p <= 1
    );
  }, [hfApiKey, models]);

  const runDurationLabel = useMemo(() => {
    if (!runStartedAt || !runCompletedAt) {
      return "~0s total";
    }
    const seconds = Math.max(0, Math.round((runCompletedAt - runStartedAt) / 1000));
    return `~${seconds}s total`;
  }, [runStartedAt, runCompletedAt]);

  const resetAll = () => {
    stopPolling();
    setCurrentStep(1);
    setCSVData(null);
    setModels([createDefaultModel()]);
    setHfApiKey("");
    setRunId(null);
    setRunStatus(null);
    setResults(null);
    setGlobalError(null);
    setRunStartedAt(null);
    setRunCompletedAt(null);
  };

  const handleRun = async () => {
    if (!csvData) {
      setGlobalError("Please upload a valid CSV before running.");
      return;
    }
    if (!canRun) {
      setGlobalError("Please provide a valid API key and model configuration before running.");
      return;
    }

    setGlobalError(null);
    setCurrentStep(3);
    setRunStartedAt(Date.now());
    setRunCompletedAt(null);

    try {
      const id = await startBenchmark({
        hfApiKey: hfApiKey.trim(),
        models: models.map((model) => ({
          ...model,
          model_id: model.model_id.trim(),
        })),
        rows: csvData.rows,
      });
      setRunId(id);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Failed to start benchmark run.");
      setCurrentStep(2);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">EvalGrid</h1>
      <p className="mb-6 text-sm text-zinc-600">Benchmark prompts across HuggingFace models in parallel.</p>

      {globalError ? (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{globalError}</span>
          <button type="button" onClick={() => setGlobalError(null)} className="text-red-700 underline underline-offset-2">
            Dismiss
          </button>
        </div>
      ) : null}

      <StepIndicator currentStep={currentStep} />

      {currentStep === 1 ? (
        <CSVUploader
          onCSVLoaded={(data) => {
            setCSVData(data);
          }}
          onNext={() => {
            if (csvData) {
              setCurrentStep(2);
            }
          }}
        />
      ) : null}

      {currentStep === 2 ? (
        <div className="space-y-4">
          <APIKeyInput value={hfApiKey} onChange={setHfApiKey} />
          <ModelConfigurator models={models} onChange={setModels} />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
            >
              ← Back
            </button>

            <button
              type="button"
              disabled={!canRun || !csvData}
              onClick={() => void handleRun()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Run Benchmark →
            </button>
          </div>
        </div>
      ) : null}

      {currentStep === 3 ? (
        <RunProgress
          runStatus={runStatus}
          models={models.map((model) => model.model_id || "(unset model)")}
          onBack={() => setCurrentStep(2)}
        />
      ) : null}

      {currentStep === 4 && results && runId ? (
        <div>
          <DownloadBar
            runId={runId}
            rowCount={results.rows.length}
            modelCount={models.length}
            durationLabel={runDurationLabel}
            onStartNew={resetAll}
            onError={(message) => setGlobalError(message)}
          />
          <ResultsTable results={results} />
        </div>
      ) : null}
    </main>
  );
}
