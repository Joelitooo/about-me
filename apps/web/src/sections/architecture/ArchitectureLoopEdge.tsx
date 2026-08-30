import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/** Push the U-turn into the apps↔Postgres gap; sit the chip on the top bar, not on Prisma. */
const LOOP_OFFSET = 120;
const LOOP_RADIUS = 12;

export function ArchitectureLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
}: EdgeProps) {
  const [edgePath, labelX] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: LOOP_RADIUS,
    offset: LOOP_OFFSET,
  });

  if (!label) {
    return <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />;
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="architecture-graph__edge-chip nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${Math.min(sourceY, targetY) + 48}px)`,
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
