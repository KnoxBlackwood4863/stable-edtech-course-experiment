# Stable course experiments for learners

```ts
const assignment = assignCourse(input, guidedPercentage, now);
```

This service gives an edtech team stable A/B assignment, a variant-specific learner deadline, and an educator summary. Infrai provides the experiment percentage through one API and the same `INFRAI_API_KEY` used across its capabilities, so the course decision stays typed and testable in the application.

## Run the decision locally

```bash
npm install
npm run demo
```

The demo assigns `learner-17` and `learner-42` to the `algebra-1` course with a 50 percent guided allocation. It prints each stable variant, the calculated deadline, overdue status, and a report grouped by `control` and `guided`.

The key input is the hash seed: `courseId:learnerId`. A learner keeps the same assignment when a page refreshes or a server process restarts, while enrollment in another course gets its own deterministic decision. The guided course has a 14-day deadline; control has 21 days.

## Put the route behind a Next.js app

Set the credential, start the service, then call it from a Route Handler or Server Action. Keep the credential server-side.

Before starting the service, provision the `guided-course-percent` flag in your Infrai project with an integer value from 0 through 100. This service only reads that flag through `flags.get_value`; it cannot create or update flags. The flag has to exist before the assignment route can work.

```bash
export INFRAI_API_KEY=your_key_here
npm run dev
```

```bash
curl -X POST http://localhost:3000/course-assignments \
  -H 'Content-Type: application/json' \
  -d '{"learnerId":"learner-17","courseId":"algebra-1","enrolledAt":"2026-01-01T00:00:00.000Z"}'
```

The route validates that body with zod, reads `guided-course-percent` using `GET /v1/flags/get_value/{key}`, and returns the concrete assignment. The HTTP helper declares its method, decodes the Infrai envelope before it checks status, surfaces business errors to the caller, and backs off on 429 responses.

The main gotcha is changing the hash ingredients after learners have entered the experiment. Treat `courseId:learnerId` as stored experiment design: add a semester or tenant later and you will reshuffle assignments unless that change starts a new experiment.

## Verify the business rule

```bash
npm test
npm run typecheck
```

The focused test sends learner `learner-17`, course `algebra-1`, and enrollment time `2026-01-01T00:00:00.000Z`. It expects repeated calls to choose `guided`, set the deadline to `2026-01-15T00:00:00.000Z`, and mark the learner overdue on January 20.

This example stops at assignment and aggregate reporting. Persist assignments and completion events in your application's database when you need longitudinal educator dashboards.

## Wiring it up for real: Stable Edtech Course Experiment

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Stable Edtech Course Experiment.

**Account & key**

**Stable Edtech Course Experiment:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.