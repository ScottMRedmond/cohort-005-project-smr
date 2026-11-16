import { db } from "~/db";
import { getLandingPage, type Db } from "./lib/landing";

export type {
  LandingCourse,
  LandingPage,
  LandingStats,
} from "./lib/landing";

/**
 * The landing page (`/`) bound to a database. The app uses `landing`, which
 * reads the app database; tests build their own against a test database.
 */
export function createLanding(database: Db) {
  return {
    /**
     * What the landing page shows. `spotlight` is the newest published
     * course and `featured` the next three, newest first, each with its
     * lesson count. `stats` counts published courses, every category, and
     * the lessons in published courses. Drafts and archived courses never
     * appear. Never throws: an empty catalogue gives a null spotlight, no
     * featured courses and zero counts.
     */
    get() {
      return getLandingPage(database);
    },
  };
}

export const landing = /* @__PURE__ */ createLanding(db);
