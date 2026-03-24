interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Configure" },
  { id: 3, label: "Run" },
  { id: 4, label: "Results" },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const className = isCurrent
          ? "text-blue-600 underline underline-offset-4"
          : isCompleted
            ? "text-zinc-500"
            : "text-zinc-300";

        return (
          <div key={step.id} className="flex items-center gap-2">
            <span className={className}>
              {isCompleted ? "✓" : step.id} {step.label}
            </span>
            {index < STEPS.length - 1 ? <span className="text-zinc-400">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}
