import type { ModelConfig } from "../types";

interface ModelConfiguratorProps {
  models: ModelConfig[];
  onChange: (models: ModelConfig[]) => void;
}

const MAX_MODELS = 5;

export function createDefaultModel(): ModelConfig {
  return {
    model_id: "",
    temperature: 0.7,
    max_new_tokens: 512,
    top_p: 0.95,
  };
}

export function ModelConfigurator({ models, onChange }: ModelConfiguratorProps) {
  const updateModel = (index: number, partial: Partial<ModelConfig>) => {
    const updated = models.map((model, i) => (i === index ? { ...model, ...partial } : model));
    onChange(updated);
  };

  const removeModel = (index: number) => {
    if (models.length <= 1) {
      return;
    }
    onChange(models.filter((_, i) => i !== index));
  };

  const addModel = () => {
    if (models.length >= MAX_MODELS) {
      return;
    }
    onChange([...models, createDefaultModel()]);
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {models.map((model, index) => (
        <div key={index} className="rounded-lg border border-zinc-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-800">Model {index + 1}</p>
            {models.length > 1 ? (
              <button type="button" className="text-sm text-red-600" onClick={() => removeModel(index)}>
                Remove
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Model ID</label>
              <input
                type="text"
                value={model.model_id}
                onChange={(event) => updateModel(index, { model_id: event.target.value })}
                placeholder="mistralai/Mistral-7B-Instruct-v0.3"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Temperature</label>
                <input
                  type="number"
                  value={model.temperature}
                  step={0.05}
                  min={0}
                  max={2}
                  onChange={(event) => updateModel(index, { temperature: Number(event.target.value) })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Max New Tokens</label>
                <input
                  type="number"
                  value={model.max_new_tokens}
                  step={64}
                  min={1}
                  max={4096}
                  onChange={(event) => updateModel(index, { max_new_tokens: Number(event.target.value) })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Top-p</label>
                <input
                  type="number"
                  value={model.top_p}
                  step={0.05}
                  min={0}
                  max={1}
                  onChange={(event) => updateModel(index, { top_p: Number(event.target.value) })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={addModel}
          disabled={models.length >= MAX_MODELS}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          + Add Model
        </button>
        <p className="mt-2 text-xs text-zinc-500">Up to 5 models supported.</p>
      </div>
    </div>
  );
}
