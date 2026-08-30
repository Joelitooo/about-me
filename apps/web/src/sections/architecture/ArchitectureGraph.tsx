import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type Edge,
  type NodeChange,
  type NodeTypes,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackEvent } from "../../lib/analytics.js";
import { useTheme } from "../../theme/ThemeProvider.js";
import { ArchitectureNode } from "./ArchitectureNode.js";
import {
  ARCHITECTURE_EDGES,
  ARCHITECTURE_NODES,
  DEFAULT_SELECTED_NODE_ID,
  isArchitectureNodeId,
  type ArchitectureFlowNode,
  type ArchitectureNodeId,
} from "./architecture.js";

const nodeTypes: NodeTypes = {
  architecture: ArchitectureNode,
};

function highlightEdges(selectedId: ArchitectureNodeId): Edge[] {
  return ARCHITECTURE_EDGES.map((edge) => {
    const active = edge.source === selectedId || edge.target === selectedId;
    const stroke = active ? "var(--color-accent)" : "var(--color-ink-soft)";
    return {
      ...edge,
      style: {
        ...edge.style,
        stroke,
        strokeWidth: active ? 2 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: stroke,
      },
    };
  });
}

function ArchitectureCanvas() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<ArchitectureNodeId>(DEFAULT_SELECTED_NODE_ID);
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureFlowNode>(
    ARCHITECTURE_NODES.map((node) => ({ ...node, data: { ...node.data } })),
  );
  const skipTracking = useRef(true);

  const edges = useMemo(() => highlightEdges(selectedId), [selectedId]);

  useEffect(() => {
    if (skipTracking.current) {
      skipTracking.current = false;
      return;
    }
    trackEvent("architecture_node_select", { node: selectedId });
  }, [selectedId]);

  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const selected = node.id === selectedId;
        if (node.selected === selected) return node;
        changed = true;
        return { ...node, selected };
      });
      return changed ? next : current;
    });
  }, [selectedId, setNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<ArchitectureFlowNode>[]) => {
      onNodesChange(changes.filter((change) => change.type !== "remove"));
    },
    [onNodesChange],
  );

  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    const nextId = selected[0]?.id;
    setSelectedId(nextId && isArchitectureNodeId(nextId) ? nextId : DEFAULT_SELECTED_NODE_ID);
  }, []);

  const ariaLabelConfig = useMemo(
    () => ({
      "controls.zoomIn.ariaLabel": t("work.architecture.controls.zoomIn"),
      "controls.zoomOut.ariaLabel": t("work.architecture.controls.zoomOut"),
      "controls.fitView.ariaLabel": t("work.architecture.controls.fitView"),
    }),
    [t],
  );

  return (
    <div>
      <p className="mb-3 text-sm text-ink-soft">{t("work.architecture.hint")}</p>
      <div
        className="architecture-graph h-[22rem] w-full overflow-hidden border border-line bg-surface sm:h-[28rem] lg:h-[32rem]"
        role="region"
        aria-label={t("work.architecture.hint")}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onSelectionChange={onSelectionChange}
          colorMode={theme}
          ariaLabelConfig={ariaLabelConfig}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.45}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable
          edgesReconnectable={false}
          edgesFocusable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          preventScrolling={false}
          panOnDrag
          zoomOnPinch
          zoomOnDoubleClick
          deleteKeyCode={null}
          multiSelectionKeyCode={null}
          defaultEdgeOptions={{
            type: "smoothstep",
            labelStyle: {
              fill: "var(--color-ink-soft)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            },
            labelBgStyle: { fill: "var(--color-surface)" },
            labelBgPadding: [4, 6],
            labelBgBorderRadius: 4,
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color="var(--color-line)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div
        className="mt-4 max-w-[68ch]"
        role="region"
        aria-label={t("work.architecture.detailLabel")}
        aria-live="polite"
      >
        <h5 className="mb-1 font-display text-lg font-semibold tracking-tight text-ink">
          {t(`work.architecture.nodes.${selectedId}.title`)}
        </h5>
        <p className="text-ink-soft">{t(`work.architecture.nodes.${selectedId}.body`)}</p>
      </div>
    </div>
  );
}

export function ArchitectureGraph() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}
