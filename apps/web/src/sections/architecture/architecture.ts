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

export const DEFAULT_SELECTED_NODE_ID: ArchitectureNodeId = "tunnel";

export type ArchitectureNodeData = {
  kind: ArchitectureKind;
  label: string;
  subtitle?: string;
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

export const ARCHITECTURE_NODES: ArchitectureFlowNode[] = [
  {
    id: "gha",
    position: { x: 0, y: 0 },
    data: { kind: "ops", label: "GitHub Actions" },
    ...locked,
  },
  {
    id: "ghcr",
    position: { x: 210, y: 0 },
    data: { kind: "ops", label: "GHCR" },
    ...locked,
  },
  {
    id: "pi",
    position: { x: 420, y: 0 },
    data: { kind: "ops", label: "Raspberry Pi" },
    ...locked,
  },
  {
    id: "browser",
    position: { x: 0, y: 190 },
    data: { kind: "client", label: "Browser" },
    ...locked,
  },
  {
    id: "tunnel",
    position: { x: 420, y: 190 },
    data: { kind: "edge", label: "Cloudflare Tunnel" },
    selected: true,
    ...locked,
  },
  {
    id: "web",
    position: { x: 660, y: 90 },
    data: { kind: "app", label: "nginx", subtitle: "joelitoo.com" },
    ...locked,
  },
  {
    id: "api",
    position: { x: 660, y: 190 },
    data: { kind: "app", label: "NestJS", subtitle: "api.joelitoo.com" },
    ...locked,
  },
  {
    id: "umami",
    position: { x: 660, y: 290 },
    data: { kind: "app", label: "Umami", subtitle: "analytics.joelitoo.com" },
    ...locked,
  },
  {
    id: "pgApp",
    position: { x: 890, y: 190 },
    data: { kind: "data", label: "Postgres (app)" },
    ...locked,
  },
  {
    id: "pgUmami",
    position: { x: 890, y: 290 },
    data: { kind: "data", label: "Postgres (Umami)" },
    ...locked,
  },
];

const edgeDefaults = {
  deletable: false,
  focusable: false,
  type: "smoothstep" as const,
};

export const ARCHITECTURE_EDGES: Edge[] = [
  { id: "gha-ghcr", source: "gha", target: "ghcr", label: "build/push", ...edgeDefaults },
  { id: "ghcr-pi", source: "ghcr", target: "pi", label: "deploy", ...edgeDefaults },
  {
    id: "pi-tunnel",
    source: "pi",
    target: "tunnel",
    label: "outbound connector",
    ...edgeDefaults,
  },
  { id: "browser-tunnel", source: "browser", target: "tunnel", label: "HTTPS", ...edgeDefaults },
  { id: "tunnel-web", source: "tunnel", target: "web", label: "joelitoo.com", ...edgeDefaults },
  {
    id: "tunnel-api",
    source: "tunnel",
    target: "api",
    label: "api.joelitoo.com",
    ...edgeDefaults,
  },
  {
    id: "tunnel-umami",
    source: "tunnel",
    target: "umami",
    label: "analytics.joelitoo.com",
    ...edgeDefaults,
  },
  { id: "api-pgApp", source: "api", target: "pgApp", label: "Prisma", ...edgeDefaults },
  { id: "umami-pgUmami", source: "umami", target: "pgUmami", label: "Umami DB", ...edgeDefaults },
  {
    id: "web-umami",
    source: "web",
    target: "umami",
    label: "tracking script",
    style: { strokeDasharray: "6 4" },
    ...edgeDefaults,
  },
];
