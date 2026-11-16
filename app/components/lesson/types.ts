import type { DenialReason } from "~/modules/permissions/course-permissions.server";
import type { RenderedComment } from "~/components/comment-thread";
import type { LessonNoteData } from "~/components/lesson-note";

export type LessonCourse = { id: number; title: string; slug: string };

export type Curriculum = Array<{
  id: number;
  title: string;
  lessons: Array<{ id: number; title: string }>;
}>;

type LessonModule = { id: number; title: string };

export type LockedLessonData = {
  course: LessonCourse;
  curriculum: Curriculum;
  module: LessonModule;
  lesson: { id: number; title: string };
  enrolled: boolean;
  lockedReason: DenialReason;
};

export type LearnerQuiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    position: number;
    options: Array<{ id: number; optionText: string }>;
  }>;
};

export type FullLessonData = {
  course: LessonCourse;
  curriculum: Curriculum;
  module: LessonModule;
  lesson: {
    id: number;
    title: string;
    videoUrl: string | null;
    durationMinutes: number | null;
    githubRepoUrl: string | null;
  };
  contentHtml: string | null;
  lessonStatus: string | null;
  enrolled: boolean;
  currentUserId: number | null;
  prevLesson: { id: number; title: string } | null;
  nextLesson: { id: number; title: string } | null;
  quiz: LearnerQuiz | null;
  bestAttempt: { score: number; passed: boolean } | null;
  lastWatchPosition: number;
  watchProgress: number;
  lessonProgressMap: Record<number, string>;
  comments: RenderedComment[];
  canModerate: boolean;
  instructorName: string;
  bookmarked: boolean;
  note: LessonNoteData;
};
