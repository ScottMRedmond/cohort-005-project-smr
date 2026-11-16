import { describeDraft, type NoteDraft } from "./lib/draft";

export type { NoteDraft };

/**
 * What the notes editor shows for the text in its box: the character count,
 * whether it differs from the saved note, and whether Save is allowed.
 */
export function describeNoteDraft(
  draft: string,
  savedBody: string | null,
  maxLength?: number
): NoteDraft {
  return describeDraft(draft, savedBody, maxLength);
}
