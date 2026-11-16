import { and, desc, eq, max } from "drizzle-orm";
import { videoWatchEvents } from "~/db/schema";
import type { Db } from "./db";

function forLearner(userId: number, lessonId: number) {
  return and(
    eq(videoWatchEvents.userId, userId),
    eq(videoWatchEvents.lessonId, lessonId)
  );
}

/** Where the learner last was in the video, in seconds, to resume from. */
export function getLastWatchPosition(db: Db, userId: number, lessonId: number) {
  const lastEvent = db
    .select({ positionSeconds: videoWatchEvents.positionSeconds })
    .from(videoWatchEvents)
    .where(forLearner(userId, lessonId))
    .orderBy(desc(videoWatchEvents.createdAt))
    .limit(1)
    .get();

  return lastEvent?.positionSeconds ?? 0;
}

/** The furthest point reached, as a whole percentage of the video, capped at 100. */
export function getWatchPercent(
  db: Db,
  { userId, lessonId }: { userId: number; lessonId: number },
  videoDurationSeconds: number
) {
  const [{ furthest }] = db
    .select({ furthest: max(videoWatchEvents.positionSeconds) })
    .from(videoWatchEvents)
    .where(forLearner(userId, lessonId))
    .all();

  return Math.min(
    Math.round(((furthest ?? 0) / videoDurationSeconds) * 100),
    100
  );
}
