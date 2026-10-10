# Frontend Responsiveness and UI Consistency Audit

Audit date: 10 October 2026 · Scope: `frontend/` (React 18, Vite, Tailwind v4) · **Audit only — no source file was changed.**

## How this was tested

**Browser testing was done**, against the locally running app (Vite on 5173, API on 5000), in headless Chromium driven by Playwright. Nothing was installed in the repo; the harness, screenshots and logs live outside it.

| What | Coverage |
|---|---|
| Viewports | 320×568, 375×667, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080 |
| Short-height checks | 320×568, 375×667, 667×375 (phone landscape), 1024×600 |
| Roles | signed out, student, placement coordinator, superadmin |
| Layout sweep | 60 route/role combinations, about 400 page loads, each measured (overflow, clipped content, target sizes) and screenshotted |
| Interactions | sidebar drawer and rail, global search, notification bell, every modal, tabs, menus, reply threads, composers |
| Content extremes | long titles/names/descriptions/URLs, 60-item lists, 18-page pagination, empty lists, failed and slow requests — injected in the test browser only, keeping the real response shape |
| Keyboard | Tab walk on 15 pages, checking that a focus style is actually rendered |

Every finding below carries one of these tags:

- **[Browser]** — measured and seen in a screenshot on your real data.
- **[Browser, synthetic content]** — seen in the browser, but only after longer or larger content was injected. No run of this kind produced an error that the real-data run did not.
- **[Static]** — from reading the code only. Not visually verified.

**Limits of the testing**

- No form was submitted and no mutating request was sent (the harness blocked them). Success/failure states after a submit were not exercised.
- `/community/clubs/:clubId/edit` returned "Access Denied" for all three test accounts, so the edit form itself is **not browser-verified**.
- Notification toasts need a live socket event and were not triggered: **not browser-verified**.
- The class-representative view of Classroom was tested through the superadmin account, which sees the same controls.
- Headless Chromium emulates viewport size, not a real touch screen or on-screen keyboard. Touch findings say so where it matters.
- Side effects on your dev database: the audit signed in once per role (three sessions remain until they expire) and opening a discussion counts a view.

---

## A. Executive Summary

**Responsiveness: good for students, weak for admin and a few specific spots.** No student-facing page overflows horizontally at any of the seven widths on real data, with one exception (My Applications at 320px). The app shell — drawer sidebar, collapsed rail, navbar, search and notification dropdowns — adapts correctly across the breakpoint. The problems are concentrated in: the admin workspace below 768px, forms that keep two or three columns on phones, modals that cannot scroll on short screens, and layouts that have only ever seen short content.

**UI consistency: two visual dialects.** The app is built in two recognisable styles. Clubs, Events, Community, Discussions, the notice cards and the club/event detail pages use the `slate` palette, bolder weights and 9–11px uppercase labels. Everything else (shell, dashboard, auth, career, classroom, admin, profile, forms) uses `gray` with a quieter look. Each half is consistent with itself; the seam shows when you move between them, and inside pages that mix both (Career, Classroom, Drive detail embed slate notice cards in gray pages).

**Major strengths**

- A correct, tested responsive shell: overlay drawer below `lg`, rail/sidebar above, reset on breakpoint change, backdrop and close button both work.
- Event detail, club detail, Discussions and discussion detail are well built: they wrap long unbroken text, use `min-w-0`/`truncate` deliberately, and have proper focus rings and `aria-label`s.
- Skeleton loaders on almost every page; explicit error states with retry on Dashboard, Community, Clubs, Events, Drives, club and event detail.
- Auth pages are clean at every width.
- Data tables (roster, applicants, timetable) are wrapped in their own horizontal scrollers, so they never break the page.

**Major weaknesses**

- One route white-screens the whole app (`/community/announcements`), and notifications link to it.
- All six admin pages overflow sideways at 320–430px because of the tab bar.
- Two modals (and a third borderline) cannot be scrolled, so their buttons are unreachable on short viewports.
- Several forms have un-prefixed `grid-cols-2`/`grid-cols-3`, leaving ~107px (and ~62px) inputs on phones.
- Three routes render raw placeholder text: `/admin`, `/admin/moderation`, and the 404 page.
- Many small, unlabelled icon buttons, including destructive ones.

**Ready for use?**

| Device class | Verdict |
|---|---|
| Desktop (1024–1920) | **Yes**, apart from the crashing announcements route and the placeholder pages. |
| Tablet (768) | **Yes**, same caveats. Touch editing of the timetable is the one tablet-specific gap. |
| Mobile, student flows (320–430) | **Mostly.** Usable today; fix the P0 items first. |
| Mobile, admin / coordinator flows | **No.** Tab bar overflow, cramped forms and unscrollable modals make these awkward to unusable. |

---

## B. Complete Page-by-Page Audit

Mobile = 320–430px, Tablet = 768px, Desktop = 1024–1920px. All rows are browser-tested unless marked. Issue ids refer to section C.

### Public

| Page / Route | Mobile | Tablet | Desktop | UI Consistency | Issues Found |
|---|---|---|---|---|---|
| `/login` | PASS | PASS | PASS | PASS | — |
| `/signup` | PASS | PASS | PASS | PASS | — |
| `/forgot-password` | PASS | PASS | PASS | PARTIAL | D8 |
| `/verify-email` (with and without token) | PASS | PASS | PASS | PARTIAL | D8 |
| `/reset-password` (with and without token) | PASS | PASS | PASS | PARTIAL | D8 |
| `*` (404) | PARTIAL | PARTIAL | PARTIAL | FAIL | C14 |

### Signed-in (any role)

| Page / Route | Mobile | Tablet | Desktop | UI Consistency | Issues Found |
|---|---|---|---|---|---|
| App shell (sidebar, navbar, footer) | PARTIAL | PASS | PASS | PASS | C6, C7, C17 |
| Global search dropdown | PARTIAL | PASS | PASS | PASS | C5, C6 |
| Notification bell dropdown | PASS | PASS | PASS | PASS | C5 (static risk) |
| Notification toasts | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | — | static read only: sized `w-80 max-w-[calc(100vw-2rem)]`, looks correct |
| `/` Dashboard | PASS | PASS | PASS | PASS | minor: two quick-access labels truncate at 320 |
| `/community` | PARTIAL | PASS | PASS | PARTIAL | C8, D1, D2 |
| `/community/clubs` | PARTIAL | PASS | PASS | PARTIAL | C8, C11, D1, D2 |
| `/community/clubs/:clubId` | PASS | PASS | PASS | PASS | — |
| `/community/clubs/create` (superadmin) | PASS | PASS | PASS | PASS | — |
| `/community/clubs/:clubId/edit` | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | — | access denied for all test accounts; code mirrors the create form |
| `/community/events` | PASS | PASS | PARTIAL | PARTIAL | C16, C8, D1, D2 |
| `/community/events/:id` | PASS | PASS | PASS | PASS | — |
| `/community/clubs/:clubId/events/create`, `/community/events/:eventId/edit` | PASS | PASS | PASS | PASS | minor: "Year N" pills wrap to two lines at 320 |
| `/community/:targetType/:targetId/announcements/create` | PASS | PASS | PASS | PASS | — |
| `/community/announcements` | FAIL | FAIL | FAIL | FAIL | C1 |
| `/academics/classroom/:classroomId` (student) | PARTIAL | PASS | PASS | PARTIAL | C13, D4 |
| `/academics/classroom/:classroomId` (manager controls) | PARTIAL | PARTIAL | PASS | PARTIAL | C3, C13, C15, C17 |
| `/academics/competitive` | PARTIAL | PASS | PASS | PASS | C3 |
| `/:targetType/:targetId/create-notice`, `/admin/notices/create` | PARTIAL | PASS | PASS | PASS | C9 |
| `/academics/:classroomId/deadline/form/:deadlineId?` | PARTIAL | PASS | PASS | PASS | C9 |
| `/discussions` | PASS | PASS | PASS | PASS | — |
| `/discussions/:id` | PASS | PASS | PASS | PASS | minor: admin delete buttons are 28×20 (C17) |
| `/career` | PARTIAL | PASS | PASS | PARTIAL | C18, D4 |
| `/career/drives` | PARTIAL | PASS | PASS | PASS | C12 (synthetic content only) |
| `/career/drives/create` | PARTIAL | PASS | PASS | PASS | C9 |
| `/career/drives/:id` (student) | PASS | PASS | PASS | PARTIAL | D4 |
| `/career/drives/:id` (coordinator tabs) | PARTIAL | PASS | PASS | PARTIAL | C9, C10, C15, D5 |
| `/career/my-applications` | PARTIAL | PASS | PASS | PASS | C4 |
| `/profile` | PASS | PASS | PASS | PASS | minor: club chips clip with very long names (synthetic) |
| Forbidden page (non-admin on `/admin`) | PASS | PASS | PASS | PASS | — |

### Admin workspace (superadmin)

| Page / Route | Mobile | Tablet | Desktop | UI Consistency | Issues Found |
|---|---|---|---|---|---|
| `/admin` (index) | FAIL | PARTIAL | PARTIAL | FAIL | C2, C14 |
| `/admin/drives` | PASS | PASS | PASS | PARTIAL | redirects to `/career/drives`; the admin tab bar disappears |
| `/admin/moderation` | FAIL | PARTIAL | PARTIAL | FAIL | C2, C14 |
| `/admin/notices` | FAIL | PASS | PASS | PARTIAL | C2, C8, D3 |
| `/admin/classrooms` | FAIL | PASS | PASS | PASS | C2 |
| `/admin/curricula` | FAIL | PASS | PASS | PASS | C2, C11, C17 |
| `/admin/roster` | FAIL | PASS | PASS | PASS | C2 |

### Why each PARTIAL / FAIL

- **404, `/admin`, `/admin/moderation`:** render a bare `<div>` of text with no styling and, for 404, no way back. Nothing overflows, but they are not finished pages.
- **App shell (mobile):** the page title is squeezed to 3–4 characters ("Eve…", "Dash…") and falls back to "EventSphere" on most routes; the search input has no focus indicator.
- **Global search (mobile):** on viewports shorter than about 590px the results panel runs off the bottom of the screen.
- **`/community`, `/community/clubs`, `/community/events`, `/admin/notices` (mobile):** these pages add their own side padding on top of the layout's, so cards are only 240px wide at 320. Consistency: slate palette and jargon copy.
- **`/community/clubs` (mobile, superadmin):** the "Create Organization" button is pushed off-screen at 320.
- **`/community/events` (desktop):** at exactly 1024px the three-column cards are narrow enough that the start time truncates to "14:…".
- **`/community/announcements`:** white screen at every width; the whole app unmounts.
- **Classroom:** timetable only shows two day columns on phones with no hint that it scrolls; manager edit/delete controls are hover-only; the add/edit period modal cannot scroll.
- **Competitive Prep (mobile):** the "Submit Resource" modal cannot scroll and is clipped on short screens.
- **Notice form, deadline form, Create Drive, drive Settings tab (mobile):** fixed multi-column grids produce inputs too narrow to read.
- **Career (mobile):** three-cell stats bar is cramped at 320; duplicate "Placement Notices" heading.
- **Drives list (mobile):** fine on current data; a long CTC string breaks the row, and many pages squash the pagination buttons.
- **Drive detail, coordinator (mobile):** fourth tab is clipped at 320.
- **My Applications (mobile):** filter row overflows at 320.
- **All `/admin/*` (mobile):** the tab bar is 567px wide and the page pans sideways.
- **`/forgot-password`, `/verify-email`, `/reset-password` (consistency):** no brand panel on desktop, unlike login and signup. Minor.

---

## C. Detailed Responsiveness Issues

### C1. `/community/announcements` white-screens the app — Critical · [Browser]

- **File:** [App.jsx:27](frontend/src/App.jsx#L27), [App.jsx:128](frontend/src/App.jsx#L128), [AnnouncementCard.jsx:64](frontend/src/pages/announcements/AnnouncementCard.jsx#L64), [notificationNavigation.js:13](frontend/src/utils/notificationNavigation.js#L13)
- **Viewports:** all.
- **What happens:** the page is blank, including sidebar and navbar. Console: `Cannot read properties of undefined (reading 'body')` in `<AnnouncementCard>`.
- **Root cause:** the route renders the single-card component `AnnouncementCard` as if it were a page, with no `announcement` prop. There is no error boundary, so React unmounts everything.
- **Impact:** every notification of type `announcement` navigates here, so tapping one kills the session's UI until a reload.
- **Fix:** point announcement notifications at the club or event the announcement belongs to (or the Community feed), and remove or replace the route. Optionally add one error boundary around `<Outlet />` in `Layout.jsx` so a page crash keeps the shell.

### C2. Admin tab bar overflows the page — Critical on mobile · [Browser]

- **File:** [WorkspaceLayout.jsx:8](frontend/src/components/layout/WorkspaceLayout.jsx#L8)
- **Viewports:** 320, 375, 430 (fine from 768).
- **What happens:** `main` measures 567px wide inside a 320–430px viewport. "Classrooms" is cut mid-word; "Curricula" and "Roster" are off-screen. The whole page pans sideways, on all six admin pages.
- **Root cause:** six `whitespace-nowrap` tabs in a plain `flex` row with no `overflow-x-auto`. (The same line also sets both `px-1` and `px-6`.)
- **Impact:** half the admin sections are hidden on a phone, and every admin page gains a horizontal scrollbar.
- **Fix:** make the tab strip its own scroller (`overflow-x-auto`, tabs `flex-shrink-0`) so the page stays put. This is the same pattern the category strips in Clubs and Events already use.

### C3. Modals that cannot scroll on short viewports — Critical for the affected flows · [Browser]

- **Files:** [CompetitivePrep.jsx:126](frontend/src/pages/academics/competitive/CompetitivePrep.jsx#L126) (Submit Resource), [Classroom.jsx:282](frontend/src/pages/academics/classroom/Classroom.jsx#L282) (Add/Edit period), [Profile.jsx:431](frontend/src/pages/profile/Profile.jsx#L431) (Change password, borderline)
- **Viewports:** phone landscape (667×375) fails; 320×568 is marginal; fine from 375×667 up.
- **What happens:**
  - Submit Resource is 572px tall. At 667×375 it is clipped 98px top and bottom: title, close button, Cancel and Submit are all unreachable. At 320×568 it is clipped 2px each side.
  - Add period: at 667×375 the header and the Cancel/Save row are off-screen (3 of 9 controls).
  - Change password is 373px tall and fits a 375px-high viewport with 2px to spare.
- **Root cause:** `fixed inset-0 flex items-center justify-center p-4` with no `overflow-y-auto` on the scrim and no `max-h` on the panel.
- **Impact:** the form cannot be submitted or dismissed. An on-screen keyboard shrinks the visible area further, so real phones will hit this in portrait too (not verifiable headless).
- **Fix:** reuse the pattern already in [Profile.jsx:174](frontend/src/pages/profile/Profile.jsx#L174) and [DriveDetail.jsx:178](frontend/src/pages/career/DriveDetail.jsx#L178): `overflow-y-auto` on the scrim, `my-8` on the panel, `max-h-[75vh] overflow-y-auto` on the body. Those two modals and the Discussions create modal passed at every size.

### C4. My Applications filter row overflows — Important · [Browser]

- **File:** [MyApplications.jsx:254](frontend/src/pages/career/MyApplications.jsx#L254)
- **Viewports:** 320 (fits from 375).
- **What happens:** `main` is 346px in a 320px viewport; the "Rejected (0)" pill is cut off and the page pans.
- **Root cause:** `flex gap-2` without `flex-wrap`.
- **Fix:** add `flex-wrap`, as the equivalent row in [DrivesList.jsx:302](frontend/src/pages/career/DrivesList.jsx#L302) already does.

### C5. Search and notification dropdowns use a pixel max-height — Important · [Browser] for search, [Static] for the bell

- **Files:** [GlobalSearch.jsx:264](frontend/src/components/layout/GlobalSearch.jsx#L264), [NotificationBell.jsx:42](frontend/src/components/layout/NotificationBell.jsx#L42)
- **Viewports:** heights below about 590px.
- **What happens:** with 10 results at 667×375 the panel extends 196px past the viewport and 5 results cannot be reached. At 320×568 the bottom 16px (result count and key hints) is cut. Fine at 375×667 and larger.
- **Root cause:** `max-h-[520px]` starting about 64px from the top, inside a root that is `overflow-hidden`. The inner list scrolls, but the panel itself is taller than the screen.
- **Impact:** results are unreachable in landscape, and likely in portrait once the keyboard opens. The bell has only two notifications in the dev data so it fit; it shares the same class and will behave the same with a long list.
- **Fix:** cap by viewport, e.g. `max-h-[min(520px,calc(100dvh-5rem))]`, on both.

### C6. Global search input has no focus indicator — Important · [Browser]

- **File:** [GlobalSearch.jsx:225](frontend/src/components/layout/GlobalSearch.jsx#L225), [GlobalSearch.jsx:244](frontend/src/components/layout/GlobalSearch.jsx#L244)
- **Viewports:** all.
- **What happens:** tabbing into the search box changes nothing visually. It was the only control with no indicator on any of the 15 pages walked.
- **Root cause:** `outline-none` on the input; the wrapper only restyles when `isOpen && query`.
- **Fix:** add a `focus-within:` border/ring to the wrapper.
- **Related, Minor:** at 320–375px the input shrinks to 42–87px depending on the title next to it, so the placeholder reads "Search everyt". The clear button ([GlobalSearch.jsx:253](frontend/src/components/layout/GlobalSearch.jsx#L253)) is a bare 12px icon.

### C7. Navbar title: truncated on phones, wrong on most routes — Important · [Browser]

- **File:** [Navbar.jsx:8-24](frontend/src/components/layout/Navbar.jsx#L8-L24), [Navbar.jsx:31](frontend/src/components/layout/Navbar.jsx#L31)
- **Viewports:** all for the fallback; 320–430 for truncation.
- **What happens:** the title is an exact-path lookup, so any route with an id or not in the map shows "EventSphere" — drives, drive detail, My Applications, club and event detail, classroom, every form, and the classrooms/curricula/roster admin tabs. The map also lists routes that do not exist (`/career/opportunities`, `/career/interviews`). On phones the title is cut to "Eve…" / "Dash…" / "Com…".
- **Impact:** the header gives no location cue on most pages, and on phones it is three letters of noise.
- **Fix:** resolve the title by longest matching prefix instead of exact path, and either hide it below `sm` or let it take the space by collapsing search to an icon.

### C8. Double horizontal padding on four pages — Important · [Browser]

- **Files:** [Clubs.jsx:181](frontend/src/pages/clubs/Clubs.jsx#L181), [Events.jsx:173](frontend/src/pages/events/Events.jsx#L173), [Community.jsx:320](frontend/src/pages/Community.jsx#L320), [ManageNotices.jsx:53](frontend/src/pages/admin/ManageNotices.jsx#L53), against [Layout.jsx:38](frontend/src/components/layout/Layout.jsx#L38)
- **Viewports:** most visible at 320–430.
- **What happens:** `main` already applies `px-6 py-6`. These pages add `px-4 sm:px-6 py-2` (or `p-6`) again, so content is inset 40px per side on a phone and cards are 240px wide at 320. Every other page uses the layout padding alone.
- **Impact:** a fifth of a small screen is lost, and these pages sit visibly narrower than their neighbours.
- **Fix:** drop the inner horizontal padding on these four pages. Separately, consider `px-4 sm:px-6` on `main` so phones get a 16px gutter everywhere.

### C9. Form grids that stay multi-column on phones — Important · [Browser]

- **Files and measurements at 320px:**
  - [CreateDrive.jsx:225](frontend/src/pages/career/CreateDrive.jsx#L225), `:248`, `:270`, `:303`, `:392`, `:415` — `grid-cols-2`, inputs 107px, placeholders cut ("e.g. Google, I"). [CreateDrive.jsx:356](frontend/src/pages/career/CreateDrive.jsx#L356) — `grid-cols-3`, inputs about 62px, label "Target Batch (Year) (optional)" wraps to three lines.
  - [DriveDetail.jsx:856](frontend/src/pages/career/DriveDetail.jsx#L856), `:883`, `:903` — Settings tab, `grid-cols-2`, including a `datetime-local` input.
  - [NoticeForm.jsx:384](frontend/src/components/forms/NoticeForm.jsx#L384) — `grid-cols-2` with a single child, so the date input is half width (107px) and shows "dd-mm-y". The checkbox label at [NoticeForm.jsx:348](frontend/src/components/forms/NoticeForm.jsx#L348) splits into two awkward columns.
  - [CreateDeadline.jsx:226](frontend/src/pages/academics/classroom/CreateDeadline.jsx#L226) — `grid-cols-4`, buttons 50px wide; "Assignment" needs 57px and spills over its border.
- **Viewports:** 320–375 (CreateDrive also tight at 430).
- **Root cause:** no responsive prefix on the grid.
- **Impact:** forms are usable but uncomfortable; values and placeholders cannot be read.
- **Fix:** `grid-cols-1 sm:grid-cols-2` (and `sm:grid-cols-3`), exactly as [EventForm.jsx:347](frontend/src/pages/events/EventForm.jsx#L347) already does. For the deadline type picker, `grid-cols-2 sm:grid-cols-4`. For the notice date, drop the grid.

### C10. Drive detail: fourth tab clipped for coordinators — Minor · [Browser]

- **File:** [DriveDetail.jsx:1118](frontend/src/pages/career/DriveDetail.jsx#L1118)
- **Viewports:** 320 (coordinator/superadmin only; students have two tabs).
- **What happens:** `main` is 325px wide; "Settings" is cut by 5px and the page pans.
- **Fix:** `overflow-x-auto` on the tab row, same as C2.

### C11. Rows that push a button off-screen — Important · [Browser]

- **Clubs header (superadmin):** [Clubs.jsx:183](frontend/src/pages/clubs/Clubs.jsx#L183), [Clubs.jsx:199](frontend/src/pages/clubs/Clubs.jsx#L199). At 320 `main` is 343px wide and "Create Organization" (`whitespace-nowrap`) is cut. Fix: let the header wrap (`flex-wrap`).
- **Curriculum "add subject" row:** [CurriculumManagement.jsx:151-170](frontend/src/pages/admin/CurriculumManagement.jsx#L151-L170). At 320 and 375 the "+ Add" button is clipped by the card edge. Root cause: the `flex-1` text input has no `min-w-0`, so it will not shrink below its intrinsic width. Fix: add `min-w-0` to that input.

### C12. Drives list breaks with a long CTC or many pages — Important · [Browser, synthetic content]

- **File:** [DrivesList.jsx:122-125](frontend/src/pages/career/DrivesList.jsx#L122-L125), [DrivesList.jsx:353](frontend/src/pages/career/DrivesList.jsx#L353)
- **Viewports:** 320–430.
- **What happens:**
  - With a 45-character CTC ("₹ 44,00,000 per annum + joining bonus + ESOPs") `main` grows to 563px, the text runs out of the card and the badges wrap into two-line pills. CTC is free text, so a string of 25+ characters is enough at 320.
  - With 18 pages the page buttons shrink to 7–14px wide at 375. They start shrinking at around 9 pages.
- **Root cause:** the pay block is `flex-shrink-0` with no truncation; pagination renders every page number in a non-wrapping row.
- **Fix:** give the pay text `min-w-0 truncate` (or let row 2 wrap), and add `flex-wrap` to the pagination row.

### C13. Classroom timetable — Important · mixed evidence

- **File:** [Classroom.jsx:140](frontend/src/pages/academics/classroom/Classroom.jsx#L140), [Classroom.jsx:164-173](frontend/src/pages/academics/classroom/Classroom.jsx#L164-L173)
- **Hover-only edit controls · [Browser]** at 320–768 as manager: filled cells show no pencil or bin, because they are `opacity-0 group-hover:opacity-100`. They are 10×10px with no `aria-label`. A touch screen has no hover. (Some mobile browsers apply hover on first tap, which may reveal them; this could not be confirmed headless.) Fix: show them whenever `editable`, or make the whole cell the edit target — both buttons already open the same modal.
- **Columns blow out with long names · [Browser, synthetic content]:** with realistic lab-course names the table grows to 2,501px and needs sideways scrolling even at 1440. Root cause: `truncate` has no effect inside an auto-layout table cell with only `min-w-[90px]`. Fix: add a `max-w` to the cell content.
- **No scroll hint · [Browser]:** at 320–430 only Mon and Tue are visible; the scroller works but nothing signals it. Minor.
- **Deadline titles · [Browser, synthetic content]:** [Classroom.jsx:443](frontend/src/pages/academics/classroom/Classroom.jsx#L443) truncates the title to one line with no way to read the rest. Minor; allow two lines.

### C14. Placeholder pages — Important · [Browser]

- **Files:** [NotFound.jsx:1](frontend/src/pages/NotFound.jsx#L1), [AdminPanel.jsx:1](frontend/src/pages/admin/AdminPanel.jsx#L1), [ModerationQueue.jsx:1](frontend/src/pages/admin/ModerationQueue.jsx#L1)
- **What happens:** each renders one unstyled line of text ("404 - Page Not Found", "AdminPanel", "ModerationQueue"). The sidebar's Admin link lands on the `AdminPanel` stub with no tab selected; Moderation is a visible tab.
- **Fix:** style the 404 like the existing [Forbidden.jsx](frontend/src/pages/Forbidden.jsx) with a link home; redirect the `/admin` index to the first real tab; hide the Moderation tab until it exists.

### C15. Modal backdrop stops 16px short — Minor · [Browser]

- **Files:** [Classroom.jsx:604](frontend/src/pages/academics/classroom/Classroom.jsx#L604) with modals at `:93` and `:282`; [DriveDetail.jsx:487](frontend/src/pages/career/DriveDetail.jsx#L487) with the modal at `:178`
- **Viewports:** all.
- **What happens:** the scrim measures viewport height minus 16px at every size; a sharp, undimmed strip of the page shows along the bottom.
- **Root cause:** the `fixed inset-0` scrim is a child of a `space-y-4` container, which gives it a 16px bottom margin.
- **Fix:** render the modals outside the `space-y-4` wrapper.

### C16. Events card: start time truncated at 1024 — Minor · [Browser]

- **File:** [Events.jsx:325](frontend/src/pages/events/Events.jsx#L325)
- **Viewports:** 1024 with the sidebar open (three columns of about 210px). Fine at 1440 and on phones.
- **What happens:** the time reads "14:…".
- **Fix:** let the status badge shrink instead of the time, or keep two columns until `xl`.

### C17. Small or unlabelled touch targets — Important for the destructive ones · [Browser]

Small text links and decorative icons are not listed. These are controls that are both small and matter:

| Control | Size | File |
|---|---|---|
| Notice Pin / Archive / Delete | 10px text and icon, no padding | [NoticeCard.jsx:161-191](frontend/src/components/cards/NoticeCard.jsx#L161-L191), `:280-310` |
| Curriculum delete, subject delete | 11–13px, no label | [CurriculumManagement.jsx:130](frontend/src/pages/admin/CurriculumManagement.jsx#L130) |
| Timetable edit / delete | 10×10, no label | [Classroom.jsx:174-187](frontend/src/pages/academics/classroom/Classroom.jsx#L174-L187) |
| Deadline menu (kebab) | 22×22, no label | [Classroom.jsx:463](frontend/src/pages/academics/classroom/Classroom.jsx#L463) |
| Modal close (X) | 16×16, no padding, no label | [DriveDetail.jsx:184](frontend/src/pages/career/DriveDetail.jsx#L184), [Classroom.jsx:286](frontend/src/pages/academics/classroom/Classroom.jsx#L286), [Profile.jsx:180](frontend/src/pages/profile/Profile.jsx#L180), [CompetitivePrep.jsx:130](frontend/src/pages/academics/competitive/CompetitivePrep.jsx#L130) |
| Sidebar close | 16×16, no label | [Sidebar.jsx:141](frontend/src/components/layout/Sidebar.jsx#L141) |
| Delete comment (admin) | 28×20 | DiscussionDetail.jsx |
| "Back" buttons | 44×16 | most detail and form pages |
| Navbar toggle, bell, avatar | adequate size, no `aria-label` | [Navbar.jsx:46](frontend/src/components/layout/Navbar.jsx#L46), `:70`, [NotificationBell.jsx:31](frontend/src/components/layout/NotificationBell.jsx#L31) |

**Fix:** add padding (`p-1.5`–`p-2`) to reach roughly 32px or more, and an `aria-label` on every icon-only button. Discussions and EventDetail already do both and are the model.

### C18. Career stats bar is cramped at 320 — Minor · [Browser]

- **File:** [CareerDashboard.jsx:282](frontend/src/pages/career/CareerDashboard.jsx#L282), `:303`
- **What happens:** three cells with `px-5` leave about 50px for text; "Open for you" wraps onto three lines. The loading skeleton at `:66` has four cells while the real bar has three.
- **Fix:** reduce the cell padding below `sm`; make the skeleton three cells.

---

## D. UI Consistency Issues

**D1. Two palettes.** Slate-only files: `Clubs`, `ClubDetail`, `Events`, `EventDetail`, `Discussions`, `DiscussionDetail`, `discussionUi`, `AnnouncementCard`, `NoticeCard`, `SectionBits`. Gray-only: the shell, dashboard, auth, career, classroom, admin, profile and every form. `Community.jsx` mixes them (55 slate, 14 gray). Primary buttons follow the same split: `bg-gray-900` (29 uses) versus `bg-slate-900` (12). The two are close in hue, so this reads as "slightly off" rather than broken. It is most noticeable where a slate `NoticeCard` sits inside a gray page (Career, Classroom, Drive detail). Pick one neutral and convert the other over time; no redesign needed.

**D2. Copy tone.** The slate pages use system-flavoured wording that the rest of the app does not: "Campus Organizations", "Search operational hubs…", "View Hub", "registered clubs online", "Synchronizing registry…" ([Clubs.jsx:100](frontend/src/pages/clubs/Clubs.jsx#L100), `:186`, `:190`, `:216`); "Campus Timelines" ([Events.jsx:178](frontend/src/pages/events/Events.jsx#L178)); "Timeline Activity Stream", "Live Timeline", "EventSphere Live", "Synchronizing Pipeline…", "Search matching feed keywords…" ([Community.jsx:47](frontend/src/pages/Community.jsx#L47), `:75`, `:331`, `:371`, `:430`); "Modify modifications to tweak this running event config details" ([EventForm.jsx:295](frontend/src/pages/events/EventForm.jsx#L295)). Elsewhere it is plain: "Placement Drives", "My Applications", "Search company or role…".

**D3. Page heading scale.** Most pages use `text-lg font-semibold text-gray-900` (Drives, My Applications, Classroom, Competitive Prep, all forms). Outliers: [ManageNotices.jsx:56](frontend/src/pages/admin/ManageNotices.jsx#L56) `text-2xl font-bold`; Clubs and Events use a small grey uppercase label as the page heading; Dashboard and Discussions use `text-xl`. Several pages have no heading at all and rely on the navbar title, which is wrong on most routes (C7).

**D4. Duplicate notice headings.** `NoticeFeed` renders its own title row ([NoticeFeed.jsx:111-130](frontend/src/components/cards/NoticeFeed.jsx#L111-L130)). Two callers wrap it in a card that already has a heading: Career shows "Placement Notices" twice ([CareerDashboard.jsx:366-386](frontend/src/pages/career/CareerDashboard.jsx#L366-L386)) and Drive detail shows "Drive Notices" then "Notices" ([DriveDetail.jsx:1259](frontend/src/pages/career/DriveDetail.jsx#L1259)). In Classroom the opposite happens: the feed is the only section not inside a white card ([Classroom.jsx:693](frontend/src/pages/academics/classroom/Classroom.jsx#L693)). [Browser]

**D5. Confirmations.** Destructive actions use the native `window.confirm` in nine places (notices, announcements, drive cancel, discussion/comment/reply delete, event actions) while Classroom has a styled `ConfirmModal`. Native dialogs are acceptable; the inconsistency is that the most destructive action in the app (advance semester) is styled and the rest are not.

**D6. Focus styles: three conventions.** Auth pages and the notice/deadline forms use a ring. Career and admin forms change only the border colour from gray-200 to gray-400, which is easy to miss. EventDetail, ClubDetail and the dashboard use `focus-visible` rings. Buttons and links mostly keep the browser outline, which is fine. [Browser]

**D7. Error states.** Dashboard, Community, Clubs, Events, Drives, club and event detail show a clear message, several with "Try again". Others fail quietly or wrongly when the API errors: Classroom shows "No classroom assigned yet"; Career shows zeros and "No eligible drives"; My Applications shows "No applications yet"; drive and discussion detail show "not found"; the profile edit modal has its error line commented out ([Profile.jsx:166](frontend/src/pages/profile/Profile.jsx#L166)). [Browser]

**D8. Smaller items.**
- Form action buttons: `rounded-xl py-2.5` in [NoticeForm.jsx:402](frontend/src/components/forms/NoticeForm.jsx#L402), `rounded-lg py-2` in CreateDrive and CreateDeadline.
- `/forgot-password`, `/verify-email` and `/reset-password` are a single centred column on desktop; login and signup have the dark brand panel.
- Very small text: 9px and 10px sizes are common in the slate files and in `NoticeCard` (14 arbitrary pixel sizes), `GlobalSearch` and `DriveDetail`. Readable on desktop, tight on phones.
- [CreateDrive.jsx:40](frontend/src/pages/career/CreateDrive.jsx#L40): selects use `appearance-none` with no replacement chevron, so they look like text inputs.
- Emoji icons in the deadline form versus lucide icons everywhere else; `react-icons` is used in one file only (Competitive Prep).
- Utility classes that do nothing: `shadow-3xs` (26 uses), `no-scrollbar` (category strips), `animate-in fade-in` (`NoticeCard`). None is defined, since `index.css` is only `@import "tailwindcss"`. Harmless, but the category strips therefore show a normal scrollbar on desktop.
- Product name: the UI says "EventSphere" (title, sidebar, footer, login) while the project docs say CampusOS.

**Not issues (left as they are):** the dashboard's two section-header styles are a deliberate `primary`/`secondary` variant ([Section.jsx:24-29](frontend/src/components/dashboard/Section.jsx#L24-L29)). Different page max-widths (2xl forms, 3xl reading pages, 4xl–6xl lists) follow content type and are fine. `rounded-lg` controls inside `rounded-xl` cards is a consistent convention.

---

## E. Shared Component and Styling Findings

**What is already shared and working:** `SectionBits.jsx`, `discussionUi.jsx`, `NoticeFeed`/`NoticeCard`, `ImageUploadZone`, the dashboard `Section`/`Row`, `useImageOk`, `useIsClamped`, `useCursorList`.

**Duplication that causes real drift** (counts are local definitions of the same idea):

| Piece | Copies | Consequence |
|---|---|---|
| Modal shell | 7 (`DriveDetail`, `Profile` ×2, `Classroom` ×2, `CompetitivePrep`, `Discussions`) | Three different behaviours. Three scroll; four do not, and three of those are tall enough to matter (C3). Only Discussions has `role="dialog"`, Escape handling and a labelled close button. |
| `Label` / `Input` / `FieldError` | 6 / 3 / 7 | Focus style differs between forms (D6); grids differ (C9). |
| Form `Section` card | 8 | Mostly identical; low risk. |
| `EmptyState` | 3 identical dashed boxes in `Classroom`, `Profile`, `CareerDashboard`, plus a different one in `Clubs` | `components/common/EmptyState.jsx` exists but is an unstyled stub nobody imports. |
| Page `Skeleton` | 8 | Page-specific by nature; leave. |

**Recommendations, smallest useful set:**

1. **One modal shell.** Move the `Modal` from [DriveDetail.jsx:177](frontend/src/pages/career/DriveDetail.jsx#L177) into `components/common/`, add Escape, `role="dialog"` and a padded, labelled close button, and use it for the three failing modals. This fixes C3, C15 and part of C17 in one place. It is the only new shared component this audit recommends.
2. **Fill the existing `EmptyState.jsx` stub** with the dashed recipe and import it in the three pages that re-declare it. No new abstraction, just using the file that is already there.
3. **Form fields:** optional. If the forms are touched for C9 anyway, moving `Label`/`Input`/`FieldError` into one file removes six copies. Not worth a separate refactor.
4. **Leave alone:** page skeletons, the dashboard widgets, `discussionUi`.

**Dead stubs** (one-line placeholders, not imported): `components/common/Loader.jsx`, `SearchBar.jsx`, `components/forms/ClubForm.jsx`, `ResourceForm.jsx`, `pages/admin/ManageClubs.jsx`; `pages/events/MyEvents.jsx` is imported in `App.jsx` but has no route. They do not affect the UI.

**Breakpoints.** Usage is simple and consistent: `sm` for column counts, `lg` for the shell and two-column page layouts; `md` appears in only four files. Two observations:

- Eleven files have **no responsive prefix at all**, including the 1,300-line `DriveDetail`, `CreateDrive`, `NoticeForm`, `CreateDeadline`, `MyApplications`, `ManageNotices`, `NoticeCard`, `WorkspaceLayout` and `Navbar`. That list matches the C-section findings almost exactly.
- At exactly 1024px the sidebar opens (256px) and `lg:grid-cols-3` layouts switch on at the same time, leaving 720px for three columns (C16). Nothing breaks; it is the tightest point in the app.

**Global CSS.** `index.css` contains only the Tailwind import; there is no theme, font or custom utility. Nothing global causes a responsiveness problem. The root layout is `h-screen overflow-hidden` with `main` as the scroller, which is why an over-wide row makes `main` pan rather than the document — worth knowing when fixing C2, C4, C10–C12.

---

## F. What Is Already Good (leave unchanged)

**Shell** [Browser]
- Sidebar: 256px overlay drawer below `lg`, closes from the X, any link, or the backdrop; scrolls internally at 375px height with Profile still visible; 64px rail above `lg` with matching content offset; resets when the breakpoint is crossed.
- Search and notification panels switch to full-width fixed panels on phones (`max-sm:fixed max-sm:inset-x-4`). Search has arrow-key navigation and Escape.
- Footer and navbar never overflow at any width.

**Pages that passed at all seven widths with nothing to fix** [Browser]
- Login, signup, forgot/verify/reset password.
- Dashboard, including its skeleton and error state.
- Event detail — the strongest page: wraps a 110-character title cleanly, good hierarchy, focus rings, labelled buttons.
- Club detail, including the manage row that wraps correctly at 320.
- Discussions and discussion detail: long unbroken strings wrap, nested replies indent sensibly at 320, the composer and the create modal fit every viewport tested, including landscape.
- Profile, including the edit modal, which scrolls correctly at every size.
- Event create/edit, club create, announcement create: single column on phones, two from `sm`.
- Forbidden page.
- Admin classrooms, curricula and roster **from 768px up**.

**Patterns worth copying, not changing**
- `flex-1 min-w-0` + `truncate` on list rows (`CareerDashboard`, `DrivesList` title block, `MyApplications`, dashboard rows).
- `break-words` on user-written content (`DiscussionDetail`, `NoticeCard`).
- Tables inside `overflow-x-auto` wrappers (roster, applicants, timetable).
- `flex-wrap` filter rows (`DrivesList`, `Discussions`).
- `grid-cols-1 sm:grid-cols-2` form rows (`EventForm`).
- Scrollable modal recipe (`Profile` edit, `DriveDetail`).
- Skeleton loaders shaped like the content they replace.
- Empty states handled everywhere: the empty-list run produced no broken layout on any page.
- Large lists: 60-item lists rendered without overflow on every page at 375 and 1440.

---

## G. Prioritized Improvement Plan

Nothing here has been implemented. Each item is a small, local change using existing Tailwind utilities.

### P0 — Critical

| # | Change | Files | Issue |
|---|---|---|---|
| 1 | Stop `/community/announcements` crashing: send announcement notifications to the owning club/event (or Community), and remove or replace the route. Optionally wrap `<Outlet />` in an error boundary. | `App.jsx`, `utils/notificationNavigation.js`, optionally `components/layout/Layout.jsx` | C1 |
| 2 | Make the admin tab strip scroll on its own (`overflow-x-auto`, `flex-shrink-0` tabs). | `components/layout/WorkspaceLayout.jsx` | C2 |
| 3 | Make the three non-scrolling modals scroll, using the recipe already in `Profile`/`DriveDetail`. | `pages/academics/competitive/CompetitivePrep.jsx`, `pages/academics/classroom/Classroom.jsx`, `pages/profile/Profile.jsx` | C3 |
| 4 | Add `flex-wrap` to the My Applications filter row. | `pages/career/MyApplications.jsx` | C4 |

### P1 — Important

| # | Change | Files | Issue |
|---|---|---|---|
| 5 | Cap search and notification panels by viewport height; add a focus style to the search wrapper. | `components/layout/GlobalSearch.jsx`, `NotificationBell.jsx` | C5, C6 |
| 6 | Navbar title by longest prefix; hide or de-prioritise it on phones. | `components/layout/Navbar.jsx` | C7 |
| 7 | Remove the extra page padding; consider `px-4 sm:px-6` on `main`. | `pages/clubs/Clubs.jsx`, `pages/events/Events.jsx`, `pages/Community.jsx`, `pages/admin/ManageNotices.jsx`, `components/layout/Layout.jsx` | C8 |
| 8 | Single-column form grids below `sm`. | `pages/career/CreateDrive.jsx`, `pages/career/DriveDetail.jsx` (Settings tab), `components/forms/NoticeForm.jsx`, `pages/academics/classroom/CreateDeadline.jsx` | C9 |
| 9 | Stop rows pushing buttons off-screen: wrap the Clubs header; `min-w-0` on the curriculum subject input; scrollable drive-detail tabs. | `pages/clubs/Clubs.jsx`, `pages/admin/CurriculumManagement.jsx`, `pages/career/DriveDetail.jsx` | C10, C11 |
| 10 | Drives list: truncate or wrap the pay text; wrap pagination. | `pages/career/DrivesList.jsx` | C12 |
| 11 | Timetable: always show edit controls when editable (or make the cell the target); cap cell width. | `pages/academics/classroom/Classroom.jsx` | C13 |
| 12 | Replace the three placeholder pages: styled 404, redirect `/admin` index, hide the Moderation tab. | `pages/NotFound.jsx`, `App.jsx` | C14 |
| 13 | Pad and label small icon buttons, destructive ones first. | `components/cards/NoticeCard.jsx`, `pages/admin/CurriculumManagement.jsx`, `Classroom.jsx`, modal close buttons, `Sidebar.jsx`, `Navbar.jsx`, `NotificationBell.jsx` | C17 |
| 14 | One shared modal shell (only if doing items 3 and 13 together makes it cheaper). | new `components/common/Modal.jsx`, then the modal call sites | E1 |

### P2 — Polish

| # | Change | Files | Issue |
|---|---|---|---|
| 15 | Render modals outside `space-y-4` so the backdrop covers the full height. | `Classroom.jsx`, `DriveDetail.jsx` | C15 |
| 16 | Events card time at 1024; Career stats bar padding and skeleton. | `pages/events/Events.jsx`, `pages/career/CareerDashboard.jsx` | C16, C18 |
| 17 | Remove the duplicate notice headings; give Classroom's notice feed a card. | `CareerDashboard.jsx`, `DriveDetail.jsx`, `Classroom.jsx` (or a `hideTitle` prop on `NoticeFeed`) | D4 |
| 18 | Plain-language copy on Clubs, Events, Community, EventForm. | those four files | D2 |
| 19 | One page-heading size; bring ManageNotices in line. | `ManageNotices.jsx`, `Clubs.jsx`, `Events.jsx` | D3 |
| 20 | Converge on one neutral (gray or slate), file by file as each is touched. | slate-family files listed in D1 | D1 |
| 21 | One focus convention for form fields. | career and admin forms | D6 |
| 22 | Honest error states where failures currently look like empty data. | `Classroom.jsx`, `CareerDashboard.jsx`, `MyApplications.jsx`, `DriveDetail.jsx`, `DiscussionDetail.jsx`, `Profile.jsx` | D7 |
| 23 | Use the existing `EmptyState.jsx` stub; delete or define the no-op utility classes; add a chevron to CreateDrive selects. | `components/common/EmptyState.jsx` and its three callers, `index.css`, `CreateDrive.jsx` | D8, E2 |

### Safe to leave as is

Everything in section F; the differing page max-widths; the dashboard's two header variants; native `confirm` dialogs (if you prefer them); per-page skeletons; `md` being rarely used.
