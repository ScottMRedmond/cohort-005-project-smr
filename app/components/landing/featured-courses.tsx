import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { CourseImage } from "~/components/course-image";
import { CourseMeta } from "~/components/landing/course-meta";
import type { LandingCourse } from "~/modules/landing/index.server";

export function FeaturedCourses({ courses }: { courses: LandingCourse[] }) {
  if (courses.length === 0) return null;
  return (
    <section className="border-t border-border bg-muted/50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Featured Courses
            </h2>
            <p className="mt-2 text-muted-foreground">
              More of the newest courses on Cadence
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/courses">
              View all
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CourseCard({ course }: { course: LandingCourse }) {
  return (
    <Link to={`/courses/${course.slug}`} className="group">
      <Card className="h-full overflow-hidden pt-0 transition-shadow group-hover:shadow-md">
        <CourseImage
          src={course.coverImageUrl}
          alt={course.title}
          className="aspect-video w-full object-cover"
        />
        <CardHeader>
          <h3 className="font-semibold leading-snug group-hover:text-primary">
            {course.title}
          </h3>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
        </CardContent>
        <CardFooter>
          <CourseMeta
            course={course}
            className="flex w-full items-center justify-between text-xs text-muted-foreground"
            iconClassName="size-3"
          />
        </CardFooter>
      </Card>
    </Link>
  );
}
