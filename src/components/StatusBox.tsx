import { ReactNode } from "react";

interface Props {
  type: "loading" | "success" | "error" | "info";
  message: string;
  children?: ReactNode;
}

export function StatusBox({ type, message, children }: Props) {
  const config = {
    loading: { icon: "◌", color: "#ff9f43" as const, border: "#ff9f43" },
    success: { icon: "●", color: "#00d9ff" as const, border: "#00d9ff" },
    error: { icon: "✕", color: "#58a6ff" as const, border: "#58a6ff" },
    info: { icon: "○", color: "#58a6ff" as const, border: "#58a6ff" },
  };

  const { icon, color, border } = config[type];

  return (
    <box
      flexDirection="column"
      border
      borderStyle="double"
      borderColor={border}
      padding={1}
      paddingX={2}
      marginTop={1}
    >
      <text>
        <span style={{ fg: color }}>{icon} </span>
        <span style={{ fg: color }}>{message}</span>
      </text>
      {children && <box marginTop={1}>{children}</box>}
    </box>
  );
}

export function LoadingBox({ message }: { message: string }) {
  return <StatusBox type="loading" message={message} />;
}

export function SuccessBox({ message, children }: { message: string; children?: ReactNode }) {
  return <StatusBox type="success" message={message}>{children}</StatusBox>;
}

export function ErrorBox({ message }: { message: string }) {
  return <StatusBox type="error" message={message} />;
}

export function InfoBox({ message }: { message: string }) {
  return <StatusBox type="info" message={message} />;
}
