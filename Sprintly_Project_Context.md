# Sprintly_Project_Context.md

## Project Overview

**Project Name**: SprintlyPlan  
**Type**: Sprint Planning & Project Management Web Application  
**Tech Stack**: Next.js 15, Firebase/Firestore, Genkit (AI), TypeScript, Tailwind CSS, Radix UI, shadcn/ui, dnd-kit  
**Port**: 9003

---

## Objective

SprintlyPlan is an agile sprint planning tool designed to help teams efficiently plan tasks within sprints, allocate resources, track progress, and generate utilization reports. The app provides AI-powered time adjustments to improve task estimation accuracy and includes role-based access control for secure team management.

---

## Functions Implemented (Core Features)

### 1. Task Management (`src/components/app/task-management.tsx`)
- Create, edit, and delete tasks
- Drag-and-drop task reordering using dnd-kit
- Assign tasks to sprints, tribes, and squads
- Multi-application impact tracking (Implementation/Support effort types)
- Individual resource assignments per task with planned days
- Progress tracking (percentage-based: 0-100%)
- Task detail view with comprehensive sections

### 2. Sprint Management (`src/components/app/sprint-management.tsx`)
- Create and manage sprints with date ranges
- View tasks associated with each sprint
- Sprint date validation

### 3. Resource Management (`src/components/app/resource-management.tsx`)
- Add resources with roles and application associations
- Edit and delete resources
- Prevent duplicate names and roles

### 4. Role Management (`src/components/app/role-management.tsx`)
- Define team roles (Designer, Developer, Tester, PM, etc.)

### 5. Application Management (`src/components/app/application-management.tsx`)
- Manage distinct products/services
- Track which applications teams are working on

### 6. Tribe & Squad Management (`src/components/app/tribe-management.tsx`)
- Organize teams into Tribes (e.g., Fusion, Vortex)
- Create Squads under Tribes (e.g., Phoenix, Dragons)

### 7. Squad Planning / Resource Allocation (`src/components/app/squad-planning-management.tsx`)
- Allocate resources to squads per sprint
- Allocation types: Dedicated (100%) or Shared (percentage-based: 10-100%)
- View and manage resource capacity
- Cross-application resource allocation

### 8. Reports (`src/components/app/reports-view.tsx`)
- Utilization reports by resource engagement
- Task completion vs planned estimates
- Filter by tribe, squad, and application
- Bar charts and line charts (Recharts)

### 9. Resource View (`src/components/app/resource-view.tsx`)
- Analyze resource capacity per sprint
- Booked effort vs available days
- Task assignments per resource
- Filter by tribe and squad

### 10. AI-Powered Time Adjustment (`src/ai/flows/ai-powered-time-adjustment.ts`)
- Genkit flow to adjust task time estimates
- Analyzes completion percentage and resource allocation
- Provides adjusted estimate in days with explanation

### 11. Authentication (`src/lib/auth.tsx`)
- Firebase Auth integration
- Email/password login
- Auto-account creation on first login

### 12. Settings (`src/components/app/settings-management.tsx`)
- Weekend day configuration
- Holiday management (add/remove)

### 13. Access Control (`src/components/app/access-control-management.tsx`)
- Role-based access control
- User role assignment

### 14. Dashboard (`src/app/dashboard/page.tsx`)
- Quick stats overview
- Data export (JSON/CSV)
- Data import functionality

---

## Functions in Pipeline

| Feature | Status | Description |
|---------|-------|-------------|
| Resource Calendar View | Partial | Route exists (`/dashboard/resource-calendar`) but component (`resource-calendar-view.tsx`) is placeholder |
| Notification System | Not Implemented | Push notifications for task assignments/updates |
| Mobile-responsive Task View | Partial | Mobile hooks exist but task detail page needs full mobile optimization |
| Offline Mode | Not Implemented | PWA capabilities for offline task viewing |
| Sprint Burndown Charts | Not Implemented | Visual progress tracking per sprint |
| Task Dependencies | Not Implemented | Link related tasks |
| File Attachments | Not Implemented | Attach documents to tasks |
| Comments/Activity Log | Not Implemented | Task-level discussions |
| Slack/Teams Integration | Not Implemented | External notifications |
| Gantt Chart View | Not Implemented | Timeline visualization |

---

## Current Stats (as of Apr 2026)

| Metric | Count |
|--------|-------|
| Total Source Files | ~100+ |
| UI Components | 30+ (shadcn/ui) |
| Pages/Routes | 20+ |
| AI Flows | 1 (Time Adjustment) |
| Database Collections | Tasks, Sprints, Resources, Roles, Applications, Tribes, Squads, SquadResourceAllocations, UserRoles, Settings, Holidays |
| Sample Data (Tasks) | 3 |
| Sample Data (Sprints) | 2 |
| Sample Data (Applications) | 3 |
| Sample Data (Resources) | 7 |
| Sample Data (Tribes) | 2 |
| Sample Data (Squads) | 4 |

---

## Project Structure

```
sprintly-3/
├── src/
│   ├── ai/
│   │   ├── flows/ai-powered-time-adjustment.ts
│   │   └── genkit.ts
│   ├── app/
│   │   ├── dashboard/          # All dashboard pages
│   │   ├── login/
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   ├── app/              # Feature components
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/
│   ├── lib/
│   │   ├── actions.ts        # Server actions
│   │   ├── auth.tsx
│   │   ├── data.ts        # Static data
│   │   ├── firebase/
│   │   └── types.ts
│   └── hooks/
├── docs/blueprint.md
├── package.json
└── project_archive.json
```

---

## Dependencies (Key)

- `@genkit-ai/google-genai` - AI integration
- `@dnd-kit/sortable` - Drag and drop
- `firebase` / `firebase-admin` - Backend
- `recharts` - Charts
- `date-fns` - Date utilities
- `zod` - Validation