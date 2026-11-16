import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  createComment,
  deleteComment,
  editComment,
} from "~/lib/comments.server";
import { fakeNotifications } from "~/lib/notifications.fake.server";
import { getRenderedThread, isCommentOnLesson } from "../index.server";

const T0 = new Date("2026-10-06T12:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonId: number;
let otherLessonId: number;
let adminId: number;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);
  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();
  [lessonId, otherLessonId] = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `L${position}`, position })
        .returning()
        .get().id
  );
  adminId = db
    .insert(schema.users)
    .values({
      name: "Ada Admin",
      email: "admin@example.com",
      role: schema.UserRole.Admin,
      avatarUrl: "https://example.com/ada.png",
    })
    .returning()
    .get().id;
});

async function post(
  userId: number,
  body: string,
  {
    when,
    parentId = null,
    onLesson = lessonId,
  }: { when: Date; parentId?: number | null; onLesson?: number }
) {
  const result = await createComment(
    db,
    userId,
    onLesson,
    parentId,
    body,
    when,
    fakeNotifications()
  );
  if (!result.ok) throw new Error(result.error);
  return result.comment.id;
}

async function remove(commentId: number) {
  await deleteComment(
    db,
    commentId,
    adminId,
    true,
    at(99),
    fakeNotifications()
  );
}

describe("getRenderedThread", () => {
  it("is empty for a lesson with no comments, or no such lesson", async () => {
    expect(await getRenderedThread(db, lessonId)).toEqual([]);
    expect(await getRenderedThread(db, 9999)).toEqual([]);
  });

  it("nests replies under their question, oldest first, with rendered HTML", async () => {
    const later = await post(base.user.id, "Second", { when: at(5) });
    const first = await post(base.user.id, "**First**", { when: at(0) });
    const reply = await post(base.instructor.id, "Answer", {
      when: at(6),
      parentId: first,
    });
    await post(adminId, "Note", { when: at(7), parentId: first });
    await post(base.user.id, "Elsewhere", {
      when: at(1),
      onLesson: otherLessonId,
    });

    const thread = await getRenderedThread(db, lessonId);

    expect(thread.map((c) => c.id)).toEqual([first, later]);
    expect(thread[0]).toMatchObject({
      body: "**First**",
      createdAt: at(0).toISOString(),
      editedAt: null,
      deleted: false,
      author: {
        id: base.user.id,
        name: "Test User",
        avatarUrl: null,
        isInstructor: false,
        isPlatformAdmin: false,
      },
    });
    expect(thread[0].bodyHtml).toContain("<strong>First</strong>");
    expect(thread[0].replies.map((r) => r.id)).toHaveLength(2);
    expect(thread[0].replies[0]).toMatchObject({
      id: reply,
      author: { isInstructor: true, isPlatformAdmin: false },
      replies: [],
    });
    expect(thread[0].replies[1].author).toMatchObject({
      name: "Ada Admin",
      avatarUrl: "https://example.com/ada.png",
      isInstructor: false,
      isPlatformAdmin: true,
    });
    expect(thread[1].replies).toEqual([]);
  });

  it("breaks a tie in time by posting order", async () => {
    const a = await post(base.user.id, "A", { when: at(0) });
    const b = await post(base.user.id, "B", { when: at(0) });
    expect((await getRenderedThread(db, lessonId)).map((c) => c.id)).toEqual([
      a,
      b,
    ]);
  });

  it("shows when a comment was edited", async () => {
    const id = await post(base.user.id, "Typo", { when: at(0) });
    editComment(db, id, base.user.id, "Fixed", at(3));
    expect((await getRenderedThread(db, lessonId))[0]).toMatchObject({
      body: "Fixed",
      editedAt: at(3).toISOString(),
    });
  });

  it("keeps a deleted question's place, without its body, while it has replies", async () => {
    const question = await post(base.user.id, "Secret", { when: at(0) });
    await post(base.instructor.id, "Answer", {
      when: at(1),
      parentId: question,
    });
    editComment(db, question, base.user.id, "Secret, edited", at(2));
    await remove(question);

    const [shown] = await getRenderedThread(db, lessonId);
    expect(shown).toMatchObject({
      id: question,
      body: "",
      bodyHtml: "",
      editedAt: null,
      deleted: true,
    });
    expect(shown.replies).toHaveLength(1);
  });

  it("drops a deleted question with no replies, and deleted replies", async () => {
    const lonely = await post(base.user.id, "Gone", { when: at(0) });
    const kept = await post(base.user.id, "Kept", { when: at(1) });
    const reply = await post(base.instructor.id, "Gone too", {
      when: at(2),
      parentId: kept,
    });
    await remove(lonely);
    await remove(reply);

    const thread = await getRenderedThread(db, lessonId);
    expect(thread.map((c) => c.id)).toEqual([kept]);
    expect(thread[0].replies).toEqual([]);
  });
});

describe("isCommentOnLesson", () => {
  it("is true only for a comment on that lesson", async () => {
    const here = await post(base.user.id, "Here", { when: at(0) });
    const there = await post(base.user.id, "There", {
      when: at(0),
      onLesson: otherLessonId,
    });
    expect(isCommentOnLesson(db, here, lessonId)).toBe(true);
    expect(isCommentOnLesson(db, there, lessonId)).toBe(false);
    expect(isCommentOnLesson(db, 9999, lessonId)).toBe(false);
  });
});
