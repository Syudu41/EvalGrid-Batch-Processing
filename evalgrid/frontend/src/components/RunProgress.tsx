import type { RunStatusResponse } from "../types";

interface RunProgressProps {
  runStatus: RunStatusResponse | null;
  models: string[];
  onBack: () => void;
}

export function RunProgress({ runStatus, models, onBack }: RunProgressProps) {
  const totalRows = runStatus?.total_rows ?? 0;
  const completedRows = runStatus?.completed_rows ?? 0;
  const progress = totalRows > 0 ? (completedRows / totalRows) * 100 : 0;
  const isFailed = runStatus?.status === "failed";
  const isCompleted = runStatus?.status === "completed";

  if (isFailed) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{runStatus.error || "Benchmark run failed."}</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      <p className="text-sm font-medium text-zinc-700">{isCompleted ? "Completed!" : "Running benchmark…"}</p>

      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <p className="text-sm text-zinc-600">
        {completedRows} of {totalRows} rows complete
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {models.map((model) => (
          <span key={model} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
            {model}
          </span>
        ))}
      </div>

      <button
        type="button"
        disabled
        title="Not available in MVP"
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-400"
      >
        Cancel
      </button>
    </div>
  );
}
