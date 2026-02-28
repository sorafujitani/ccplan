import matter from "gray-matter";

export type PlanStatus = "draft" | "active" | "done" | "archived";

export const VALID_STATUSES: PlanStatus[] = [
  "draft",
  "active",
  "done",
  "archived",
];

export type CcplanFrontmatter = {
  status: PlanStatus;
  created: string;
  updated: string;
  branch?: string;
};

export type ParsedPlan = {
  frontmatter: CcplanFrontmatter | null;
  content: string;
  rawData: Record<string, unknown>;
};

export function isValidStatus(s: string): s is PlanStatus {
  return VALID_STATUSES.includes(s as PlanStatus);
}

export function createDefaultFrontmatter(): CcplanFrontmatter {
  const now = new Date().toISOString();
  return {
    status: "draft",
    created: now,
    updated: now,
  };
}

export function parsePlan(raw: string): ParsedPlan {
  const { data, content } = matter(raw);

  const ccplan = data.ccplan as Record<string, unknown> | undefined;
  if (!ccplan || typeof ccplan !== "object") {
    return { frontmatter: null, content, rawData: data };
  }

  const status =
    typeof ccplan.status === "string" && isValidStatus(ccplan.status)
      ? ccplan.status
      : "draft";

  const frontmatter: CcplanFrontmatter = {
    status,
    created: typeof ccplan.created === "string" ? ccplan.created : "",
    updated: typeof ccplan.updated === "string" ? ccplan.updated : "",
    branch:
      typeof ccplan.branch === "string" ? ccplan.branch : undefined,
  };

  return { frontmatter, content, rawData: data };
}

export function serializePlan(
  raw: string,
  updates: Partial<CcplanFrontmatter>,
): string {
  const { data, content } = matter(raw);

  const existing =
    data.ccplan && typeof data.ccplan === "object"
      ? (data.ccplan as Record<string, unknown>)
      : {};

  const merged: Record<string, unknown> = { ...existing, ...updates };
  merged.updated = new Date().toISOString();

  // branch が undefined なら削除しない（既存を保持）
  if (updates.branch === undefined && existing.branch !== undefined) {
    merged.branch = existing.branch;
  }

  data.ccplan = merged;

  return matter.stringify(content, data);
}
