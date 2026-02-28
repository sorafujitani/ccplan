import matter from "gray-matter";

export const VALID_STATUSES = ["draft", "active", "done"] as const;

export type PlanStatus = (typeof VALID_STATUSES)[number];

export type CcplanFrontmatter = {
  status: PlanStatus;
  created: string;
  updated: string;
};

export type ParsedPlan = {
  frontmatter: CcplanFrontmatter | null;
  content: string;
  rawData: Record<string, unknown>;
};

export function isValidStatus(s: string): s is PlanStatus {
  return (VALID_STATUSES as readonly string[]).includes(s);
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
  };

  return { frontmatter, content, rawData: data };
}

export function serializePlan(
  raw: string,
  updates: Partial<CcplanFrontmatter>,
): string {
  const parsed = matter(raw);
  const data = structuredClone(parsed.data);

  const existing =
    data.ccplan !== null && typeof data.ccplan === "object"
      ? (data.ccplan as Record<string, unknown>)
      : {};

  const merged: Record<string, unknown> = { ...existing, ...updates };
  merged.updated = new Date().toISOString();

  data.ccplan = merged;

  return matter.stringify(parsed.content, data);
}
