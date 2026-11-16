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
  const length = draft.length;
  const tooLong = length > maxLength;
  // The save action rejects a blank note, so a blank draft cannot be saved.
  const empty = draft.trim().length === 0;
  const unsaved = draft !== (savedBody ?? "");

  return {
    length,
    maxLength,
    tooLong,
    empty,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}
