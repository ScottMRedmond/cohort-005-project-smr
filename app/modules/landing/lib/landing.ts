import { count, desc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

const { categories, courses, lessons, modules, users } = schema;

const FEATURED_COUNT = 3;

export type LandingCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  categoryName: string;
  lessonCount: number;
};

export type LandingStats = {
  courses: number;
  categories: number;
  lessons: number;
};

export type LandingPage = {
  spotlight: LandingCourse | null;
  featured: LandingCourse[];
  stats: LandingStats;
};

export function getLandingPage(db: Db): LandingPage {
  const newest = getNewestPublishedCourses(db, FEATURED_COUNT + 1);
  const lessonCounts = countLessonsByCourse(
    db,
    newest.map((course) => course.id)
  );
  const withCounts = newest.map((course) => ({
    ...course,
    lessonCount: lessonCounts.get(course.id) ?? 0,
  }));

  return {
    spotlight: withCounts[0] ?? null,
    featured: withCounts.slice(1),
    stats: getStats(db),
  };
}

function getNewestPublishedCourses(db: Db, limit: number) {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageUrl: courses.coverImageUrl,
      instructorName: users.name,
      categoryName: categories.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .where(eq(courses.status, CourseStatus.Published))
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(limit)
    .all();
}

function countLessonsByCourse(db: Db, courseIds: number[]) {
  const rows = db
    .select({ courseId: modules.courseId, lessons: count(lessons.id) })
    .from(modules)
    .innerJoin(lessons, eq(lessons.moduleId, modules.id))
    .where(inArray(modules.courseId, courseIds))
    .groupBy(modules.courseId)
    .all();
  return new Map(rows.map((row) => [row.courseId, row.lessons]));
}

function getStats(db: Db): LandingStats {
  const published = eq(courses.status, CourseStatus.Published);
  const [{ courses: courseCount }] = db
    .select({ courses: count() })
    .from(courses)
    .where(published)
    .all();
  const [{ categories: categoryCount }] = db
    .select({ categories: count() })
    .from(categories)
    .all();
  const [{ lessons: lessonCount }] = db
    .select({ lessons: count() })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(published)
    .all();

  return {
    courses: courseCount,
    categories: categoryCount,
    lessons: lessonCount,
  };
}
