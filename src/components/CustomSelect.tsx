import { useState } from "react";
import { useKeyboard } from "@opentui/react";

interface SelectOption {
  name: string;
  description?: string;
  value?: any;
}

interface Props {
  options: SelectOption[];
  onSelect: (item: SelectOption) => void;
  focused?: boolean;
  height?: number;
}

export function MenuSelect({ options, onSelect, focused = true, height }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visibleCount = height || options.length;

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "up") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.name === "down") {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.name === "return") {
      onSelect(options[selectedIndex]);
    }
  });

  const getVisibleOptions = () => {
    if (options.length <= visibleCount) return options;
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(visibleCount / 2), options.length - visibleCount));
    return options.slice(start, start + visibleCount);
  };

  const visibleOptions = getVisibleOptions();
  const startIndex = options.length > visibleCount ? Math.max(0, Math.min(selectedIndex - Math.floor(visibleCount / 2), options.length - visibleCount)) : 0;

  return (
    <box flexDirection="column" gap={1}>
      {visibleOptions.map((opt, i) => {
        const realIndex = startIndex + i;
        const isSelected = realIndex === selectedIndex;

        return (
          <box
            key={realIndex}
            flexDirection="row"
            paddingX={2}
            padding={1}
            border
            borderStyle={isSelected ? "double" : "single"}
            borderColor={isSelected ? "#58a6ff" : "#2d333b"}
            backgroundColor={isSelected ? "#1a1a2e" : undefined}
            width="100%"
          >
            <box width={3} alignItems="center">
              <text>
                <span style={{ fg: isSelected ? "#58a6ff" : "#2d333b" }}>{isSelected ? "▸" : "·"}</span>
              </text>
            </box>
            <box flexGrow={1} flexDirection="column">
              <text>
                <span style={{ fg: isSelected ? "#ffffff" : "#8b949e" }}>{opt.name}</span>
              </text>
              {opt.description && (
                <text>
                  <span style={{ fg: isSelected ? "#58a6ff" : "#484f58" }}>  {opt.description}</span>
                </text>
              )}
            </box>
          </box>
        );
      })}
    </box>
  );
}

interface CardSelectProps {
  options: SelectOption[];
  onSelect: (item: SelectOption) => void;
  focused?: boolean;
  height?: number;
}

export function CardSelect({ options, onSelect, focused = true, height = 5 }: CardSelectProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visibleCount = Math.min(height, options.length);

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "up") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.name === "down") {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.name === "return") {
      onSelect(options[selectedIndex]);
    }
  });

  const getVisibleRange = () => {
    if (options.length <= visibleCount) return { start: 0, items: options };
    let start = selectedIndex - Math.floor(visibleCount / 2);
    if (start < 0) start = 0;
    if (start + visibleCount > options.length) start = Math.max(0, options.length - visibleCount);
    return { start, items: options.slice(start, start + visibleCount) };
  };

  const { start: startIndex, items: visibleOptions } = getVisibleRange();
  const hasMoreUp = startIndex > 0;
  const hasMoreDown = startIndex + visibleCount < options.length;

  return (
    <box flexDirection="column" gap={0}>
      {hasMoreUp && (
        <text>
          <span style={{ fg: "#484f58" }}>  ▲ mais {startIndex} acima</span>
        </text>
      )}
      {visibleOptions.map((opt, i) => {
        const realIndex = startIndex + i;
        const isSelected = realIndex === selectedIndex;

        return (
          <box
            key={realIndex}
            flexDirection="row"
            paddingX={1}
            border
            borderStyle={isSelected ? "double" : "single"}
            borderColor={isSelected ? "#00d9ff" : "#21262d"}
            width="100%"
          >
            <box width={4} alignItems="center">
              <text>
                <span style={{ fg: isSelected ? "#00d9ff" : "#21262d" }}>{isSelected ? "◆" : "◇"}</span>
              </text>
            </box>
            <box flexGrow={1} flexDirection="column">
              <text>
                <span style={{ fg: isSelected ? "#00d9ff" : "#c9d1d9" }}>{opt.name}</span>
              </text>
              {opt.description && (
                <text>
                  <span style={{ fg: isSelected ? "#58a6ff" : "#484f58" }}>  {opt.description}</span>
                </text>
              )}
            </box>
            {isSelected && (
              <box alignItems="center">
                <text>
                  <span style={{ fg: "#00d9ff" }}>ENTER</span>
                </text>
              </box>
            )}
          </box>
        );
      })}
      {hasMoreDown && (
        <text>
          <span style={{ fg: "#484f58" }}>  ▼ mais {options.length - startIndex - visibleCount} abaixo</span>
        </text>
      )}
    </box>
  );
}

interface MinimalSelectProps {
  options: SelectOption[];
  onSelect: (item: SelectOption) => void;
  focused?: boolean;
  height?: number;
}

export function MinimalSelect({ options, onSelect, focused = true, height = 15 }: MinimalSelectProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboard((key) => {
    if (!focused) return;
    if (key.name === "up") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.name === "down") {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.name === "return") {
      onSelect(options[selectedIndex]);
    }
  });

  const getVisibleOptions = () => {
    if (options.length <= height) return options;
    let start = selectedIndex - Math.floor(height / 2);
    if (start < 0) start = 0;
    if (start + height > options.length) start = Math.max(0, options.length - height);
    return options.slice(start, start + height);
  };

  const visibleOptions = getVisibleOptions();
  const startIndex = options.length > height ? Math.max(0, Math.min(selectedIndex - Math.floor(height / 2), options.length - height)) : 0;

  return (
    <box flexDirection="column" gap={0}>
      {visibleOptions.map((opt, i) => {
        const realIndex = startIndex + i;
        const isSelected = realIndex === selectedIndex;

        return (
          <box key={realIndex} flexDirection="row" paddingX={1}>
            <box width={3} alignItems="center">
              <text>
                <span style={{ fg: isSelected ? "#ff9f43" : "transparent" }}>►</span>
              </text>
            </box>
            <text>
              <span style={{ fg: isSelected ? "#ffffff" : "#8b949e" }}>{opt.name}</span>
            </text>
            {opt.description && (
              <text>
                <span style={{ fg: "#484f58" }}>  {opt.description}</span>
              </text>
            )}
          </box>
        );
      })}
    </box>
  );
}
