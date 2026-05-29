// Single source of truth for the onboarding disclaimers and their version.
//
// IMPORTANT: the wording below and the single-checkbox bundling are PROVISIONAL,
// pending the lawyer consult. When the copy changes in a way that should require
// re-acceptance, bump DISCLAIMER_VERSION. The gate in src/app/(app)/page.tsx
// re-prompts any user whose stored disclaimersVersion is below this number.
//
// No em-dashes in this copy: it is app UI, not sobr's chat (see CLAUDE.md).

export const DISCLAIMER_VERSION = 1;

export type CrisisResource = {
  label: string;
  detail: string;
  // href makes the resource tappable on mobile (tel:/sms:).
  href: string;
};

// Crisis resources are shown as live, non-gated content on the disclaimer step:
// reachable without accepting anything. Numbers must stay exact.
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    label: "988",
    detail: "Suicide & Crisis Lifeline, call or text",
    href: "tel:988",
  },
  {
    label: "Text HOME to 741741",
    detail: "Crisis Text Line",
    href: "sms:741741?&body=HOME",
  },
  {
    label: "911",
    detail: "If you are in immediate danger",
    href: "tel:911",
  },
];

export type Disclaimer = {
  title: string;
  body: string;
};

export const DISCLAIMERS: Disclaimer[] = [
  {
    title: "This is companion support, not medical care",
    body: "sobrandsteady is a lifestyle and peer companion app. It is not a mental health service, a clinical or medical tool, or a substitute for professional care. If you need professional help, please reach out to a licensed provider.",
  },
  {
    title: "In a crisis, get real help fast",
    body: "sobr is not an emergency service and is not a substitute for crisis help. If you are in danger, please use the resources above right away.",
  },
  {
    title: "sobr is AI, and it can be wrong",
    body: "Your conversations are processed by Anthropic, our AI provider. Anthropic does not train its models on them and keeps them for up to 30 days for trust and safety review, then deletes them. sobr can make mistakes, so use your own judgment. See our privacy page for the full picture.",
  },
];

// The load-bearing statement the user affirmatively agrees to. Kept short and
// plain so it clearly carries the essential terms (clickwrap enforceability).
export const ACCEPTANCE_LABEL =
  "I understand sobrandsteady is peer and companion support, not professional or medical care, and that sobr is AI and can be wrong.";
