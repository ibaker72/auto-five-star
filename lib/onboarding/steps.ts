/**
 * Onboarding step ordering.
 *
 * The current step is stored on organizations.onboarding_step. Completion is
 * marked by setting onboarding_completed_at — once set the user is dropped
 * into the dashboard.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "business",
  "industry",
  "google",
  "notifications",
  "voice",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  business: "Business profile",
  industry: "Industry",
  google: "Connect Google",
  notifications: "Notifications",
  voice: "Brand voice",
  done: "All set",
};

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return (
    typeof value === "string" &&
    (ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

export function nextStep(current: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current);
  if (idx < 0 || idx === ONBOARDING_STEPS.length - 1) return "done";
  return ONBOARDING_STEPS[idx + 1]!;
}

export function previousStep(current: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current);
  if (idx <= 0) return "welcome";
  return ONBOARDING_STEPS[idx - 1]!;
}

export function stepProgress(current: OnboardingStep): {
  index: number;
  total: number;
} {
  const total = ONBOARDING_STEPS.length - 1; // exclude "done"
  const index = Math.min(ONBOARDING_STEPS.indexOf(current), total);
  return { index, total };
}
