export type OnboardingAccessDecision =
  | "error"
  | "dashboard"
  | "create-company";

export function decideOnboardingAccess(
  hasError: boolean,
  memberships: ReadonlyArray<unknown> | null,
): OnboardingAccessDecision {
  if (hasError || memberships === null) {
    return "error";
  }

  if (memberships.length > 0) {
    return "dashboard";
  }

  return "create-company";
}