import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("counts characters against the note limit by default", () => {
    const draft = describeNoteDraft("hello", null);
    expect(draft.length).toBe(5);
    expect(draft.maxLength).toBe(MAX_NOTE_LENGTH);
  });

  it("lets a new, non-blank note be saved", () => {
    expect(describeNoteDraft("hello", null)).toMatchObject({
      empty: false,
      tooLong: false,
      unsaved: true,
      canSave: true,
    });
  });

  it("does not offer to save an empty box with no saved note", () => {
    expect(describeNoteDraft("", null)).toMatchObject({
      empty: true,
      unsaved: false,
      canSave: false,
    });
  });

  it("treats a whitespace-only draft as empty and unsaveable", () => {
    expect(describeNoteDraft("   \n ", null)).toMatchObject({
      empty: true,
      unsaved: true,
      canSave: false,
    });
  });

  it("does not offer to save a draft that matches the saved note", () => {
    expect(describeNoteDraft("same", "same")).toMatchObject({
      unsaved: false,
      canSave: false,
    });
  });

  it("marks an edited note as unsaved", () => {
    expect(describeNoteDraft("same, edited", "same")).toMatchObject({
      unsaved: true,
      canSave: true,
    });
  });

  it("allows a draft exactly at the limit", () => {
    expect(describeNoteDraft("abc", null, 3)).toMatchObject({
      tooLong: false,
      canSave: true,
    });
  });

  it("refuses a draft one character over the limit", () => {
    expect(describeNoteDraft("abcd", null, 3)).toMatchObject({
      length: 4,
      tooLong: true,
      canSave: false,
    });
  });
});
