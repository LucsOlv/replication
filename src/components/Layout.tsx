import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
  help?: string[];
}

export function Layout({ children, title = "Replication", help = [] }: Props) {

  return (
    <box flexDirection="column" height="100%" width="100%" >
      <box
        height={6}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        border
        borderColor="#00d9ff"
      >
        <ascii-font text="Replication" font="block" />
        <text>
          <span style={{ fg: "#58a6ff" }}>{title}</span>
        </text>
      </box>

      <box flexGrow={1} flexDirection="column" paddingX={2} padding={1} width="100%">
        {children}
      </box>

      <box
        height={2}
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        border
        borderColor="#2d333b"
        gap={3}
      >
        {help.map((h, i) => {
          const parts = h.split(" ");
          return (
            <box key={i} flexDirection="row" gap={1}>
              <text>
                <span style={{ fg: "#58a6ff" }}>{parts[0]}</span>
              </text>
              <text>
                <span style={{ fg: "#484f58" }}>{parts.slice(1).join(" ")}</span>
              </text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
