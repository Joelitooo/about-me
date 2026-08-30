import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { ArchitectureFlowNode, ArchitectureHandleSide } from "./architecture.js";

const HANDLE_POSITION: Record<ArchitectureHandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

export function ArchitectureNode({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const targetHandles = data.targetHandles ?? ["left"];
  const sourceHandles = data.sourceHandles ?? ["right"];

  function handleStyle(side: ArchitectureHandleSide, type: "source" | "target") {
    if (!targetHandles.includes(side) || !sourceHandles.includes(side)) return undefined;
    const offset = type === "source" ? "32%" : "68%";
    return side === "left" || side === "right" ? { top: offset } : { left: offset };
  }

  return (
    <div
      className={`w-40 cursor-pointer rounded-md border bg-canvas px-3 py-2 transition-colors duration-150 ${
        selected ? "border-accent ring-2 ring-accent" : "border-line"
      }`}
    >
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft">
        {data.kind}
      </p>
      <p className="font-display text-sm font-semibold leading-tight tracking-tight text-ink">
        {data.label}
      </p>
      {data.subtitle ? (
        <p className="mt-0.5 font-mono text-[0.65rem] leading-tight text-ink-soft">
          {data.subtitle}
        </p>
      ) : null}
      {targetHandles.map((side) => (
        <Handle
          key={`target-${side}`}
          id={`target-${side}`}
          type="target"
          position={HANDLE_POSITION[side]}
          isConnectable={false}
          style={handleStyle(side, "target")}
        />
      ))}
      {sourceHandles.map((side) => (
        <Handle
          key={`source-${side}`}
          id={`source-${side}`}
          type="source"
          position={HANDLE_POSITION[side]}
          isConnectable={false}
          style={handleStyle(side, "source")}
        />
      ))}
    </div>
  );
}
