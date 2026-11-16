import { BookOpen, User } from "lucide-react";
import type { LandingCourse } from "~/modules/landing/index.server";

/** A landing course's instructor and lesson count, side by side. */
export function CourseMeta({
  course,
  className,
  iconClassName,
}: {
  course: Pick<LandingCourse, "instructorName" | "lessonCount">;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={className}>
      <span className="flex items-center gap-1">
        <User className={iconClassName} />
        {course.instructorName}
      </span>
      <span className="flex items-center gap-1">
        <BookOpen className={iconClassName} />
        {course.lessonCount} lessons
      </span>
    </div>
  );
}
