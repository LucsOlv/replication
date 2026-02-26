interface Props {
  current: number;
  total: number;
  labels?: string[];
}

export function StepIndicator({ current, total, labels }: Props) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <box flexDirection="row" gap={2} marginBottom={1}>
      {steps.map((step) => {
        const isActive = step === current;
        const isCompleted = step < current;
        const label = labels?.[step - 1] || `${step}`;

        return (
          <box key={step} flexDirection="row" gap={1}>
            <text>
              {isCompleted && <span style={{ fg: "#00d9ff" }}>●</span>}
              {isActive && <span style={{ fg: "#58a6ff" }}>◆</span>}
              {!isCompleted && !isActive && <span style={{ fg: "#2d333b" }}>○</span>}
            </text>
            <text>
              <span style={{ fg: isActive ? "#ffffff" : "#484f58" }}>{label}</span>
            </text>
            {step < total && (
              <text>
                <span style={{ fg: "#2d333b" }}>─</span>
              </text>
            )}
          </box>
        );
      })}
    </box>
  );
}
