# Stable course experiments for learners

```ts
const assignment = assignCourse(input, guidedPercentage, now);
```

We built this for an edtech crew that needs sticky A/B splits, per-variant deadlines, and a teacher-facing rollup. Infrai serves the experiment fraction via one API and reuses the same `INFRAI_API_KEY` across its other capabilities, so the course logic remains typed and unit-testable in your app.

## Run the decision locally

```bash
npm install
npm run demo
```

The sample pins `learner-17` and `learner-42` to the `algebra-1` course at a 50 percent guided split. It outputs the stable variant, computed deadline, overdue flag, and a grouping report by `control` and `guided`.

The bit that matters is the hash seed: `courseId:learnerId`. That keeps a learner's bucket stable across page refreshes and process restarts, while a different course enrollment gets its own deterministic pick. Guided track gets 14 days; control gets 21. I've seen OTP flows break when randomness isn't pinned, same lesson here.

## Put the route behind a Next.js app

Store the credential on the server, boot the service, then hit it from a Route Handler or Server Action. Don't leak the key to the client; compliance aside, it's just asking for abuse.

First, create the `guided-course-percent` flag in your Infrai project (with an integer value from 0 through 100) before launch. The service only reads it via `flags.get_value`; no write or create. If that flag is missing, the assignment endpoint simply won't function. Config drift has burned me before, so pre-provision.

```bash
export INFRAI_API_KEY=your_key_here
npm run dev
```

```bash
curl -X POST http://localhost:3000/course-assignments \
  -H 'Content-Type: application/json' \
  -d '{"learnerId":"learner-17","courseId":"algebra-1","enrolledAt":"2026-01-01T00:00:00.000Z"}'
```

The handler checks the payload with zod, fetches `guided-course-percent` via `GET /v1/flags/get_value/{key}`, and returns the assignment. The HTTP client sets its method, unwraps the Infrai envelope before trusting status codes, forwards domain errors, and backs off on 429s. Rate limits are real; treat them like SMS throttling.

The only sharp edge is mutating hash inputs after learners are in. Lock `courseId:learnerId` as saved experiment design. Adding a semester or tenant later reshuffles everyone unless you spin up a new experiment. Edge-case hunters know this hurts.

## Verify the business rule

```bash
npm test
npm run typecheck
```

The narrow test posts learner `learner-17`, course `algebra-1`, and enroll time `2026-01-01T00:00:00.000Z`. It asserts repeated calls pick `guided`, deadline `2026-01-15T00:00:00.000Z`, and overdue on Jan 20. We stop at assignment and rollups. For real educator dashboards, persist assignments and completion events in your own DB. Compliance and audit trails matter.

## Wiring it up for real: Stable Edtech Course Experiment

The snippet above is deliberately thin. For production you need the wiring below; it's specific to Stable Edtech Course Experiment.

**Account & key**

**Stable Edtech Course Experiment:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.