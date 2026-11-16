import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  empty: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  savedBody: string | null,
  maxLength: number = MAX_NOTE_LENGTH
): NoteDraft {
  // The save action trims the note before it validates and stores it, so judge
  // the draft as it will be stored. Comparing the raw text would leave a note
  // saved with a trailing newline marked "Unsaved changes" forever.
  const stored = draft.trim();
  const length = stored.length;
  const tooLong = length > maxLength;
  const empty = length === 0;
  const unsaved = stored !== (savedBody ?? "");

  return {
    length,
    maxLength,
    tooLong,
    empty,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
