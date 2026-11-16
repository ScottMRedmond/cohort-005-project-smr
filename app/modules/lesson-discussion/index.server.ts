import { and, eq } from "drizzle-orm";
import { comments } from "~/db/schema";
import { renderComment } from "~/lib/comment-markdown.server";
import type { Db } from "./lib/db";
import { getLessonThread, type ThreadComment } from "./lib/thread.server";

export type { Db };

export type RenderedThreadComment = Omit<ThreadComment, "replies"> & {
  bodyHtml: string;
  replies: RenderedThreadComment[];
};

/**
 * Renders every comment body to sanitised HTML, preserving the reply nesting.
 * Comments are untrusted input, so this must be renderComment — never
 * renderMarkdown, which lets raw HTML through for trusted lesson content.
 */
async function renderThread(
  nodes: ThreadComment[]
): Promise<RenderedThreadComment[]> {
  return Promise.all(
    nodes.map(async (node) => ({
      ...node,
      bodyHtml: node.deleted ? "" : await renderComment(node.body),
      replies: await renderThread(node.replies),
    }))
  );
}

/**
 * The lesson's Questions & Discussion, oldest first, replies nested under
 * their question, bodies rendered to safe HTML. Deleted comments keep their
 * place without their body; a deleted question with no replies is dropped.
 */
export async function getRenderedThread(
  db: Db,
  lessonId: number
): Promise<RenderedThreadComment[]> {
  return renderThread(getLessonThread(db, lessonId));
}

/**
 * Whether the comment is on this lesson, so a comment elsewhere can't be
 * reached by posting its id to this lesson.
 */
export function isCommentOnLesson(
  db: Db,
  commentId: number,
  lessonId: number
): boolean {
  const found = db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.lessonId, lessonId)))
    .get();
  return found !== undefined;
}
