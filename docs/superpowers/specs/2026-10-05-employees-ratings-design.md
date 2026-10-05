# Employees, Workload & Ratings — Design

Date: 2026-10-05
Status: Draft for review

## Goal

A top-level **Employees** section that lists every employee, shows what each one is
working on right now, highlights who has no work, and tracks a **points + rating**
score per employee with a full profile page.

## Constraints (agreed)

- **Browser-first.** Employees and ratings live in the existing persisted zustand store
  (`electrosoft-proposal-store-v1`). No new Supabase tables or migrations. A backend
  will be built later once the feature is locked; the shapes below map 1:1 to tables.
- Work data is **read** from what already exists (production tasks, order stages, QA
  action points) through `src/lib/db.ts`, which already falls back to browser storage
  in demo mode. Nothing new is written to those tables.
- Scoring uses **both** automatic task points and manual manager ratings. Rules live in
  one file so they can be changed later.

## Data

### Employee (extended, all new fields optional)

```ts
interface Employee {
  id: string;
  name: string;
  designation: string;
  phone?: string;
  department?: string;
  joinedOn?: string;   // yyyy-mm-dd
  active?: boolean;    // default true
}
```

### Seed employees

Add to `src/data/employeesData.ts` (designation blank, editable in Settings):
Rahul Pawar, Anees Shaikh, Mubin Shaikh, Saud Chaudhary, Fardin Shaikh,
Mushtaque Shaikh, Farhaan Shaikh, Shahebaz Shaikh, Nazeel Shaikh, Nizam Shaikh,
Sufiyan Kotawdekar, Sufiyan Shaikh, Aabid Shaikh, Amaan Khan.

The store gets `version: 1` with a `migrate` that appends any seed employee whose name
(case-insensitive) is not already present, so browsers with saved state also see them.
Existing edits/deletions are untouched.

### Rating (new store slice)

```ts
interface EmployeeRating {
  id: string;
  employeeId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment: string;
  ratedBy: string;
  createdAt: number;
  taskRef?: { kind: "production" | "stage" | "qa"; id: string; label: string; orderId?: string };
}
```

Store actions: `addRating`, `deleteRating` (both behind `requireAdminPassword()`).

## Work aggregation — `src/lib/employeeWork.ts`

Loads all `production_tasks` (+ panels for labels), `project_stages`, `mom_points`
(+ sessions for order link) and inward orders once, then buckets items per employee
by **name match** (trimmed, case-insensitive):

| Source | Matched on | Current when | Completed when |
|---|---|---|---|
| Production task | `assignees[]` | status ≠ done | status = done |
| Order stage | `assigned_to` | status ≠ done | status = done |
| QA action point | `owner` | status = open | status = closed |

Each item: `{ kind, id, title, orderId, orderLabel, status, startDate?, dueDate?, completedOn?, late }`.

An employee with zero current items is **Available**; otherwise **Busy**.

## Scoring — `src/lib/employeeScore.ts`

```
Completed on/before due date (or no due date)   +10
Completed after due date                         +5
Open and past due date                           −2
Each manager rating                              stars × 4
```

Returns `{ total, breakdown: {onTime, late, overdue, ratingPoints}, avgStars, ratingCount }`.
Rank = position by total points among active employees.

## Pages

### `/employees` (new sidebar entry, `Users` icon)

- Summary tiles: Total, Busy, Available, Avg rating.
- Search by name/designation; filter All / Busy / Available; sort Points / Rating / Name.
- Card per employee: avatar (reuse `Avatar` from `AssigneePicker`), name, designation,
  Busy/Available chip, current item count + first current item, stars, points.
- Click → profile.

### `/employees/$id` (profile)

- Header: avatar, name, designation, department, phone, joined; total points, avg stars,
  rank, Busy/Available.
- Points breakdown strip (on time / late / overdue / ratings).
- Tabs:
  - **Current work** — list with order link, due date, late badge.
  - **Completed** — list with completion date, on-time/late, and a **Rate** button.
  - **Ratings** — history (stars, comment, rated by, date, linked task); **Add rating**
    (general, not tied to a task).
- Rating dialog: 1–5 stars, comment, rated-by (employee dropdown).

### `/settings/employees`

Form gains phone, department, joined date, active toggle.

## States

- Loading: skeletons. Load failure: inline error with retry; ratings still shown.
- Employee id not found: "Employee not found" with link back.
- Inactive employees hidden from the list by default (toggle to show).

## Out of scope

Login-based permissions for rating, time-period leaderboards, notifications,
backend tables.

## Testing

No test runner is configured in this repo. Verify with `tsc --noEmit`, a production
build, and a manual run in the browser (seed employees appear, work buckets, rating flow, points math).
