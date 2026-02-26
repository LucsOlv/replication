import { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  width?: number | `${number}%`;
  showStep?: { current: number; total: number };
}

export function ScreenContainer({ title, children, width = 70, showStep }: Props) {
  return (
    <box
      flexDirection="column"
      border
      borderStyle="double"
      borderColor="#58a6ff"
      padding={1}
      paddingX={2}
      width={width}
    >
      <box marginBottom={1} flexDirection="row" justifyContent="space-between">
        <text>
          <span style={{ fg: "#58a6ff" }}>{title}</span>
        </text>
        {showStep && (
          <text>
            <span style={{ fg: "#484f58" }}>Passo {showStep.current}/{showStep.total}</span>
          </text>
        )}
      </box>
      <box flexDirection="column" gap={1}>
        {children}
      </box>
    </box>
  );
}
