export const VALID_STATUSES = ["draft", "active", "done"] as const;

export type PlanStatus = (typeof VALID_STATUSES)[number];

export function isValidStatus(s: string): s is PlanStatus {
  return (VALID_STATUSES as readonly string[]).includes(s);
}
