import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { ArchitectureFlowNode } from "./architecture.js";

export function ArchitectureNode({ data, selected }: NodeProps<ArchitectureFlowNode>) {
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
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
