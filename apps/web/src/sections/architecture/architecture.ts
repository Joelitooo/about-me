import type { Edge, Node } from "@xyflow/react";

export const ARCHITECTURE_NODE_IDS = [
  "gha",
  "ghcr",
  "pi",
  "browser",
  "tunnel",
  "web",
  "api",
  "umami",
  "pgApp",
  "pgUmami",
] as const;

export type ArchitectureNodeId = (typeof ARCHITECTURE_NODE_IDS)[number];
export type ArchitectureKind = "ops" | "client" | "edge" | "app" | "data";
export type ArchitectureHandleSide = "left" | "right" | "top" | "bottom";

export const DEFAULT_SELECTED_NODE_ID: ArchitectureNodeId = "tunnel";
export const ARCHITECTURE_LAYOUT_ID = "v6";

export type ArchitectureNodeData = {
  kind: ArchitectureKind;
  label: string;
  subtitle?: string;
  targetHandles?: ArchitectureHandleSide[];
  sourceHandles?: ArchitectureHandleSide[];
};

export type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;

export function isArchitectureNodeId(id: string): id is ArchitectureNodeId {
  return (ARCHITECTURE_NODE_IDS as readonly string[]).includes(id);
}

const locked = {
  type: "architecture" as const,
  deletable: false,
  connectable: false,
  draggable: false,
};

/** Node is `w-40` (160px). Track width is sized so 10px edge chips still fit after fitView. */
const NODE_W = 160;
const GAP_X = 260;
const COL = NODE_W + GAP_X;
const SHIP_Y = 0;
const FLOW_Y = 320;
const STACK = 230;
const APP_X = COL * 3;
const DB_X = COL * 4;

export const ARCHITECTURE_NODES: ArchitectureFlowNode[] = [
  {
    id: "gha",
    position: { x: 0, y: SHIP_Y },
    data: { kind: "ops", label: "GitHub Actions", sourceHandles: ["right"], targetHandles: [] },
    ...locked,
  },
  {
    id: "ghcr",
    position: { x: COL, y: SHIP_Y },
    data: { kind: "ops", label: "GHCR" },
    ...locked,
  },
  {
    id: "pi",
    position: { x: COL * 2, y: SHIP_Y },
    data: { kind: "ops", label: "Raspberry Pi", sourceHandles: ["bottom"] },
    ...locked,
  },
  {
    id: "browser",
    position: { x: 0, y: FLOW_Y },
    data: { kind: "client", label: "Browser", sourceHandles: ["right"], targetHandles: [] },
    ...locked,
  },
  {
    id: "tunnel",
    position: { x: COL * 2, y: FLOW_Y },
    data: {
      kind: "edge",
      label: "Cloudflare Tunnel",
      targetHandles: ["left", "top"],
      sourceHandles: ["right"],
    },
    selected: true,
    ...locked,
  },
  {
    id: "web",
    position: { x: APP_X, y: FLOW_Y - STACK },
    data: { kind: "app", label: "nginx", subtitle: "joelitoo.com", sourceHandles: ["right"] },
    ...locked,
  },
  {
    id: "api",
    position: { x: APP_X, y: FLOW_Y },
    data: { kind: "app", label: "NestJS", subtitle: "api.joelitoo.com" },
    ...locked,
  },
  {
    id: "umami",
    position: { x: APP_X, y: FLOW_Y + STACK },
    data: {
      kind: "app",
      label: "Umami",
      subtitle: "analytics.joelitoo.com",
      targetHandles: ["left", "right"],
      sourceHandles: ["right"],
    },
    ...locked,
  },
  {
    id: "pgApp",
    position: { x: DB_X, y: FLOW_Y },
    data: { kind: "data", label: "Postgres (app)", sourceHandles: [] },
    ...locked,
  },
  {
    id: "pgUmami",
    position: { x: DB_X, y: FLOW_Y + STACK },
    data: { kind: "data", label: "Postgres (Umami)", sourceHandles: [] },
    ...locked,
  },
];

const edgeDefaults = {
  deletable: false,
  focusable: false,
  type: "smoothstep" as const,
};

export const ARCHITECTURE_EDGES: Edge[] = [
  {
    id: "gha-ghcr",
    source: "gha",
    target: "ghcr",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "build/push",
    ...edgeDefaults,
  },
  {
    id: "ghcr-pi",
    source: "ghcr",
    target: "pi",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "deploy",
    ...edgeDefaults,
  },
  {
    id: "pi-tunnel",
    source: "pi",
    target: "tunnel",
    sourceHandle: "source-bottom",
    targetHandle: "target-top",
    label: "outbound connector",
    ...edgeDefaults,
  },
  {
    id: "browser-tunnel",
    source: "browser",
    target: "tunnel",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "HTTPS",
    ...edgeDefaults,
  },
  {
    id: "tunnel-web",
    source: "tunnel",
    target: "web",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "joelitoo.com",
    ...edgeDefaults,
  },
  {
    id: "tunnel-api",
    source: "tunnel",
    target: "api",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "api.joelitoo.com",
    ...edgeDefaults,
  },
  {
    id: "tunnel-umami",
    source: "tunnel",
    target: "umami",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "analytics.joelitoo.com",
    ...edgeDefaults,
  },
  {
    id: "api-pgApp",
    source: "api",
    target: "pgApp",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "Prisma",
    ...edgeDefaults,
  },
  {
    id: "umami-pgUmami",
    source: "umami",
    target: "pgUmami",
    sourceHandle: "source-right",
    targetHandle: "target-left",
    label: "Umami DB",
    ...edgeDefaults,
  },
  {
    id: "web-umami",
    source: "web",
    target: "umami",
    sourceHandle: "source-right",
    targetHandle: "target-right",
    type: "architectureLoop",
    label: "tracking script",
    style: { strokeDasharray: "6 4" },
    deletable: false,
    focusable: false,
  },
];
