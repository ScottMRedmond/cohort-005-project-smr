import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatRelativeTime } from "~/lib/utils";
import { describeNoteDraft, type NoteDraft } from "~/modules/lesson-notes";

export type LessonNoteData = { body: string; updatedAt: string } | null;

// Laid out like CommentThread (same card padding, heading and footer row) so
// the two writing areas on the lesson page read as one family.
export function LessonNote({ note }: { note: LessonNoteData }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [body, setBody] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const draft = describeNoteDraft(body, note?.body ?? null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.error) {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Card className="mb-8">
      <CardContent className="px-6">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Your notes</h2>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" />
            Private — only you can see these
          </span>
        </div>

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            className="resize-y"
          />

          <NoteFooter note={note} draft={draft} isSaving={isSaving} />
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteFooter({
  note,
  draft,
  isSaving,
}: {
  note: LessonNoteData;
  draft: NoteDraft;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={isSaving || !draft.canSave}>
        {isSaving ? "Saving..." : "Save note"}
      </Button>

      <NoteStatus note={note} unsaved={draft.unsaved} />

      <span
        className={cn(
          "ml-auto text-xs",
          draft.tooLong ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {draft.length} / {draft.maxLength}
      </span>
    </div>
  );
}

function NoteStatus({
  note,
  unsaved,
}: {
  note: LessonNoteData;
  unsaved: boolean;
}) {
  if (unsaved) {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (!note) return null;
  return (
    <span suppressHydrationWarning className="text-xs text-muted-foreground">
      Saved {formatRelativeTime(note.updatedAt)}
    </span>
  );
}
