import { Link } from "react-router";
import { ArrowRight, BookOpen, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CourseImage } from "~/components/course-image";
import type {
  LandingCourse,
  LandingStats,
} from "~/modules/landing/index.server";

export function Hero({
  spotlight,
  stats,
  signedIn,
}: {
  spotlight: LandingCourse | null;
  stats: LandingStats;
  signedIn: boolean;
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
      <div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Learn to code,
          <br />
          <span className="text-muted-foreground">at your own pace</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Structured courses built by experienced instructors. Track your
          progress, take quizzes, and build real-world skills.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/courses">
              Browse Courses
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            {signedIn ? (
              <Link to="/dashboard">Go to your dashboard</Link>
            ) : (
              <Link to="/signup">Create a free account</Link>
            )}
          </Button>
        </div>
        <HeroStats stats={stats} />
      </div>
      {spotlight && <Spotlight course={spotlight} />}
    </section>
  );
}

function HeroStats({ stats }: { stats: LandingStats }) {
  const items = [
    { value: stats.courses, label: "Courses" },
    { value: stats.lessons, label: "Lessons" },
    { value: stats.categories, label: "Categories" },
  ];
  return (
    <dl className="mt-12 flex gap-10 border-t border-border pt-8">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-3xl font-bold tracking-tight">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Spotlight({ course }: { course: LandingCourse }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      <CourseImage
        src={course.coverImageUrl}
        alt={course.title}
        className="aspect-video w-full object-cover"
      />
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Newest course · {course.categoryName}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight group-hover:underline">
          {course.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-muted-foreground">
          {course.description}
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="size-4" />
            {course.instructorName}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="size-4" />
            {course.lessonCount} lessons
          </span>
        </div>
      </div>
    </Link>
  );
}
