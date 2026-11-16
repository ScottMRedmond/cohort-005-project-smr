import { and, eq } from "drizzle-orm";
import {
  lessonProgress,
  lessons,
  LessonProgressStatus,
  modules,
} from "~/db/schema";
import type { Db } from "./db";

export function getLessonProgress(db: Db, userId: number, lessonId: number) {
  return db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .get();
}

export function getProgressMapForCourse(
  db: Db,
  userId: number,
  courseId: number
): Record<number, string> {
  const rows = db
    .select({
      lessonId: lessonProgress.lessonId,
      status: lessonProgress.status,
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(
      and(eq(lessonProgress.userId, userId), eq(modules.courseId, courseId))
    )
    .all();

  return Object.fromEntries(rows.map((row) => [row.lessonId, row.status]));
}

/** Mark the lesson in progress, unless it is already completed; returns its status. */
export function markLessonInProgress(
  db: Db,
  userId: number,
  lessonId: number
): LessonProgressStatus {
  const existing = getLessonProgress(db, userId, lessonId);

  if (existing?.status === LessonProgressStatus.Completed) {
    return existing.status;
  }
  if (existing) {
    db.update(lessonProgress)
      .set({ status: LessonProgressStatus.InProgress })
      .where(eq(lessonProgress.id, existing.id))
      .run();
  } else {
    db.insert(lessonProgress)
      .values({ userId, lessonId, status: LessonProgressStatus.InProgress })
      .run();
  }
  return LessonProgressStatus.InProgress;
}

export function markLessonComplete(
  db: Db,
  { userId, lessonId }: { userId: number; lessonId: number },
  now: Date
) {
  const existing = getLessonProgress(db, userId, lessonId);
  const completed = {
    status: LessonProgressStatus.Completed,
    completedAt: now.toISOString(),
  };

  if (existing) {
    db.update(lessonProgress)
      .set(completed)
      .where(eq(lessonProgress.id, existing.id))
      .run();
    return;
  }

  db.insert(lessonProgress)
    .values({ userId, lessonId, ...completed })
    .run();
}
