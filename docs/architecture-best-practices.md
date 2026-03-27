# Architecture Best Practices & Folder Hierarchy Research

A comprehensive analysis of your current codebase structure with actionable recommendations for improvement, tailored to your **NRM Mobile** monorepo containing an **Expo/React Native** mobile app and **.NET backend** APIs.

---

## 1. Current State Analysis

### Your Monorepo Structure

```
NRM Mobile/
├── NRMMobileApp/          ← Expo/React Native mobile app
├── GDi.W4.WebApi/         ← .NET Web API backend
├── WFM_Model/             ← Entity Framework data models
└── WFM_WebApp/            ← .NET MVC web application
```

### Issues Identified

> [!WARNING]
> **Critical issues in your current structure:**
> - **Duplicate folder conventions** — `components/`, `hooks/`, `constants/` exist at root AND inside `src/`, creating confusion about where to put new code
> - **Giant screen files** — `TaskListScreen.tsx` is **67KB** (~1,700+ lines), making it very hard to maintain
> - **Flat `WFM_Model`** — 50+ model files in a single directory with no domain grouping
> - **Mixed concerns in `api/`** — API client, service calls, and business logic are blended together
> - **No shared types** — No `types/` or `models/` folder for TypeScript interfaces

---

## 2. Recommended Mobile App Architecture (Feature-Based)

The industry best practice for React Native / Expo apps at your scale is a **feature-based architecture** (also called "domain-driven" or "vertical slices"). This keeps related code together instead of scattering it across horizontal layers.

### Recommended Folder Structure

```
NRMMobileApp/
├── app/                          # Expo Router (file-based routing only)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # → thin wrapper, imports from features/
│   │   ├── calendar.tsx
│   │   ├── forms.tsx
│   │   └── settings.tsx
│   ├── auth/
│   │   └── login.tsx
│   ├── task-detail.tsx
│   └── _layout.tsx
│
├── src/
│   ├── features/                 # 🔑 Feature modules (vertical slices)
│   │   ├── tasks/
│   │   │   ├── components/       # TaskCard, TaskFilters, TaskBadge
│   │   │   ├── screens/          # TaskListScreen, TaskDetailScreen
│   │   │   ├── hooks/            # useTaskList, useTaskFilters
│   │   │   ├── services/         # taskService.ts, taskApi.ts
│   │   │   ├── types/            # task.types.ts
│   │   │   ├── utils/            # task-specific helpers
│   │   │   └── index.ts          # public barrel export
│   │   │
│   │   ├── calendar/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   │
│   │   ├── jobs/
│   │   │   ├── components/       # JobCard, etc.
│   │   │   ├── screens/          # FormioWebViewScreen
│   │   │   ├── services/         # jobService.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── comments/
│   │   │   ├── components/       # TaskComments
│   │   │   ├── services/         # commentService.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── context/          # AuthContext.tsx
│   │   │   ├── screens/          # LoginScreen.tsx
│   │   │   ├── services/         # TokenStorage.ts
│   │   │   └── index.ts
│   │   │
│   │   └── settings/
│   │       ├── screens/
│   │       ├── services/         # settingsService, userSettingsService
│   │       └── index.ts
│   │
│   ├── shared/                   # 🔑 Cross-cutting, reusable code
│   │   ├── components/           # LoadingOverlay, FormioInlineWebView
│   │   ├── hooks/                # useColorScheme, useThemeColor
│   │   ├── services/             # signalRService, notificationService
│   │   ├── api/                  # apiClient.ts (Axios/fetch config)
│   │   ├── types/                # common.types.ts, api.types.ts
│   │   ├── utils/                # formatDate, validators, etc.
│   │   └── constants/            # API URLs, enums, magic values
│   │
│   └── theme/                    # Design tokens
│       ├── colors.ts
│       ├── typography.ts
│       ├── spacing.ts
│       └── index.ts
│
├── assets/                       # Static images, fonts, icons
├── scripts/                      # Build/dev scripts
├── docs/                         # Project documentation
└── [config files]                # package.json, tsconfig, docker, etc.
```

### Key Principles

| Principle | What it means | Why it matters |
|---|---|---|
| **Feature isolation** | Each feature owns its components, hooks, services, and types | You can work on `tasks/` without touching `calendar/` |
| **Barrel exports** | Each feature has an `index.ts` that exposes its public API | Other features only import from `features/tasks`, never deep paths |
| **Thin route files** | `app/` files are wrappers — they import and render a screen | Keeps routing separate from logic |
| **Shared = truly shared** | Only code used by 2+ features goes in `shared/` | Prevents `shared/` from becoming a dumping ground |
| **Co-located tests** | Tests live next to the code they test (`*.test.ts`) | Easy to find, easy to maintain |

---

## 3. Recommended Backend Architecture (.NET)

Your .NET projects already have decent separation. Here's the recommended **Clean Architecture** refinement:

### GDi.W4.WebApi — Recommended Structure

```
GDi.W4.WebApi/
├── Controllers/
│   ├── Mobile/                  # ✅ You already group by domain
│   ├── Scheduler/
│   └── W4/
│
├── Application/                 # Business logic layer (NEW)
│   ├── Tasks/
│   │   ├── Commands/            # CreateTaskCommand, UpdateTaskCommand
│   │   ├── Queries/             # GetTaskQuery, GetTaskListQuery
│   │   ├── Handlers/            # Business rule execution
│   │   └── DTOs/                # Data Transfer Objects
│   ├── Jobs/
│   └── Comments/
│
├── Domain/                      # Core entities & interfaces (NEW)
│   ├── Entities/
│   ├── Interfaces/              # ITaskRepository, IJobService
│   └── Enums/
│
├── Infrastructure/              # External concerns
│   ├── Services/                # SignalR, external API clients
│   ├── Persistence/             # DB context, migrations
│   └── Configuration/           # DI registration
│
├── Models/                      # Request/Response models (API contracts)
│   ├── Mobile/                  # ✅ Already grouped
│   └── Scheduler/
│
├── Helpers/                     # Utility classes
├── Hubs/                        # SignalR hubs
└── [config files]
```

### WFM_Model — Recommended Structure

```
WFM_Model/
├── Entities/
│   ├── Workforce/               # Worker, WorkerSkill, WorkerAvailability...
│   ├── Department/              # Department, DepartmentPermission...
│   ├── Scheduling/              # Job, JobType, ReservedSlot...
│   ├── Configuration/           # EavField, EavFieldValue, Questionnaire...
│   └── Common/                  # Document, Region, Skill...
│
├── Context/                     # DbContext classes
│   ├── WFMModel.Context.cs
│   └── TenantWfmDatabaseContext.cs
│
└── Enums/                       # PermissionEnum, etc.
```

---

## 4. Breaking Down Large Files

> [!IMPORTANT]
> `TaskListScreen.tsx` at **67KB** is a code smell. Industry guideline: no component file should exceed **~300-400 lines**.

### Strategy: Extract → Compose

```
features/tasks/screens/TaskListScreen.tsx  (was 1700+ lines, now ~200)
  ├── Uses: features/tasks/components/TaskFilters.tsx
  ├── Uses: features/tasks/components/TaskListView.tsx
  ├── Uses: features/tasks/components/TaskSearchBar.tsx
  ├── Uses: features/tasks/hooks/useTaskList.ts         ← data fetching
  ├── Uses: features/tasks/hooks/useTaskFilters.ts      ← filter logic
  └── Uses: features/tasks/hooks/useTaskActions.ts      ← CRUD handlers
```

**Pattern**: Extract each **logical concern** into:
- **Custom hooks** for state management, data fetching, and business logic
- **Sub-components** for distinct UI sections
- **Utility functions** for data transformations

---

## 5. Additional Best Practices

### API Layer Pattern

```
src/shared/api/apiClient.ts          ← Axios instance, interceptors, auth headers
src/features/tasks/services/
  ├── taskApi.ts                     ← Raw API calls (GET /tasks, POST /tasks)
  └── taskService.ts                 ← Business logic + error handling wrapper
```

> [!TIP]
> Separate **raw API calls** (thin wrappers around HTTP) from **service logic** (transforms, error handling, caching). This makes testing and mocking much easier.

### Type Safety

```
src/features/tasks/types/task.types.ts
  ├── Task                           ← Core entity interface
  ├── TaskListResponse               ← API response shape
  ├── TaskCreatePayload              ← API request shape
  └── TaskFilterParams               ← Query params
```

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Feature folders | `camelCase` | `features/tasks/` |
| Component files | `PascalCase` | `TaskCard.tsx` |
| Hook files | `camelCase` with `use` prefix | `useTaskList.ts` |
| Service files | `camelCase` with `Service` suffix | `taskService.ts` |
| Type files | `camelCase` with `.types` suffix | `task.types.ts` |
| Util files | `camelCase` | `dateFormatter.ts` |
| Constants | `UPPER_SNAKE_CASE` values | `API_BASE_URL` |

### Environment & Config

```
src/shared/config/
  ├── env.ts                         ← Environment variable access
  ├── apiConfig.ts                   ← API endpoints registry
  └── appConfig.ts                   ← Feature flags, defaults
```

---

## 6. Migration Priority (Suggested Order)

| Priority | Action | Impact | Effort |
|---|---|---|---|
| 🔴 **P0** | Break down `TaskListScreen.tsx` into hooks + sub-components | High | Medium |
| 🔴 **P0** | Create `features/` directory and move tasks code first | High | Medium |
| 🟡 **P1** | Consolidate duplicate root `components/` + `hooks/` into `src/shared/` | Medium | Low |
| 🟡 **P1** | Add a `types/` folder in each feature | Medium | Low |
| 🟢 **P2** | Separate `api/` raw calls from service logic | Medium | Medium |
| 🟢 **P2** | Group `WFM_Model` entities into domain folders | Low | Low |
| 🟢 **P3** | Refactor backend to Clean Architecture layers | Low | High |

---

## 7. Summary

The core philosophy: **organize by feature, not by file type**. Your current `src/components/`, `src/screens/`, `src/services/` are organized horizontally. As the app grows, these bags become unmanageable. Feature-based organization keeps related code together and makes the codebase navigable by business domain.
