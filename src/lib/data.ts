import type { Sprint, Application, Resource, Task, Tribe, Squad, SquadResourceAllocation, Role, ImageData } from './types';

export const sprints: Sprint[] = [
  { id: 'sprint-1', name: 'Sprint 1 (Q3)', startDate: new Date('2024-07-01'), endDate: new Date('2024-07-14') },
  { id: 'sprint-2', name: 'Sprint 2 (Q3)', startDate: new Date('2024-07-15'), endDate: new Date('2024-07-28') },
];

export const applications: Application[] = [
  { id: 'app-1', name: 'Mobile App' },
  { id: 'app-2', name: 'Web Portal' },
  { id: 'app-3', name: 'Backend API' },
];

export const roles: Role[] = [
  { id: 'role-1', name: 'Designer' },
  { id: 'role-2', name: 'Developer' },
  { id: 'role-3', name: 'Tester' },
  { id: 'role-4', name: 'PM' },
];

export const resources: Resource[] = [
  { id: 'res-1', name: 'Designer-1', roleId: 'role-1', applicationId: 'app-1' },
  { id: 'res-2', name: 'Developer-1', roleId: 'role-2', applicationId: 'app-1' },
  { id: 'res-3', name: 'Developer-2', roleId: 'role-2', applicationId: 'app-2' },
  { id: 'res-4', name: 'Tester-1', roleId: 'role-3', applicationId: 'app-2' },
  { id: 'res-5', name: 'Developer-3', roleId: 'role-2', applicationId: 'app-3' },
  { id: 'res-6', name: 'PM-1', roleId: 'role-4' },
  { id: 'res-7', name: 'Designer-2', roleId: 'role-1', applicationId: 'app-2' },
];

export const tasks: Task[] = [
  {
    id: 'task-1',
    referenceId: 'REF-001',
    title: 'Design Login Screen',
    description: 'Create mockups and wireframes for the mobile app login screen.',
    sprintId: 'sprint-1',
    tribeId: 'tribe-1',
    squadId: 'squad-1',
    status: 'Completed',
    progress: 100,
    impactedApps: [
        { applicationId: 'app-1', effortType: 'Implementation', effort: 3, resourceAssignments: [{ resourceId: 'res-1', plannedDays: 3 }] },
    ],
    remarks: 'Initial designs approved.',
    estimatedDays: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'task-2',
    referenceId: 'REF-002',
    title: 'Develop User Authentication API',
    description: 'Build the endpoints for user registration and login.',
    sprintId: 'sprint-1',
    tribeId: 'tribe-2',
    squadId: 'squad-3',
    status: 'In Progress',
    progress: 75,
    impactedApps: [
        { applicationId: 'app-3', effortType: 'Implementation', effort: 5, resourceAssignments: [{ resourceId: 'res-5', plannedDays: 5 }] },
    ],
    remarks: 'Pending security review.',
    estimatedDays: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'task-3',
    referenceId: 'REF-003',
    title: 'Implement Frontend for Web Portal Dashboard',
    description: 'Code the main dashboard view for the web portal.',
    sprintId: 'sprint-2',
    tribeId: 'tribe-1',
    squadId: 'squad-2',
    status: 'Not Started',
    progress: 0,
    impactedApps: [
        { applicationId: 'app-2', effortType: 'Implementation', effort: 8, resourceAssignments: [{ resourceId: 'res-3', plannedDays: 5 }, { resourceId: 'res-7', plannedDays: 3 }] },
    ],
    remarks: '',
    estimatedDays: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const tribes: Tribe[] = [
  { id: 'tribe-1', name: 'Fusion' },
  { id: 'tribe-2', name: 'Vortex' },
];

export const squads: Squad[] = [
  { id: 'squad-1', name: 'Phoenix', tribeId: 'tribe-1' },
  { id: 'squad-2', name: 'Dragons', tribeId: 'tribe-1' },
  { id: 'squad-3', name: 'Titans', tribeId: 'tribe-2' },
  { id: 'squad-4', name: 'Cobras', tribeId: 'tribe-2' },
];

export const squadResourceAllocations: SquadResourceAllocation[] = [
    { id: 'alloc-1', sprintId: 'sprint-1', squadId: 'squad-1', resourceId: 'res-2', allocationType: 'Dedicated' },
    { id: 'alloc-2', sprintId: 'sprint-1', squadId: 'squad-1', resourceId: 'res-1', allocationType: 'Shared', allocationPercentage: 50 },
    { id: 'alloc-3', sprintId: 'sprint-1', squadId: 'squad-3', resourceId: 'res-5', allocationType: 'Dedicated' },
    { id: 'alloc-4', sprintId: 'sprint-1', squadId: 'squad-1', resourceId: 'res-6', allocationType: 'Shared', allocationPercentage: 20 },
    { id: 'alloc-5', sprintId: 'sprint-1', squadId: 'squad-2', resourceId: 'res-6', allocationType: 'Shared', allocationPercentage: 80 },
    { id: 'alloc-6', sprintId: 'sprint-2', squadId: 'squad-2', resourceId: 'res-3', allocationType: 'Dedicated' },
    { id: 'alloc-7', sprintId: 'sprint-2', squadId: 'squad-2', resourceId: 'res-7', allocationType: 'Shared', allocationPercentage: 50 },
    { id: 'alloc-8', sprintId: 'sprint-2', squadId: 'squad-4', resourceId: 'res-4', allocationType: 'Shared', allocationPercentage: 50 },
];

export const imageData: ImageData = {
    "screenshots": {
        "dashboard": {
            "src": "/Main_Dashboar.jpg",
            "alt": "Sprintly Dashboard",
            "caption": "The main dashboard provides a comprehensive overview of your project's health.",
            "width": 1200,
            "height": 750,
            "data-ai-hint": "dashboard analytics"
        },
        "sprints": {
            "src": "/Manage_Sprints.jpg",
            "alt": "Sprint Management",
            "caption": "Create and manage your project sprints.",
            "width": 1200,
            "height": 600,
            "data-ai-hint": "project management"
        },
        "tribes": {
            "src": "/Manage_Tribes_and_Squads.jpg",
            "alt": "Tribe and Squad Management",
            "caption": "Organize your teams into Tribes and Squads.",
            "width": 1200,
            "height": 600,
            "data-ai-hint": "team structure"
        },
        "applications": {
            "src": "/applications.png",
            "alt": "Application Management",
            "caption": "List all the distinct products, services, or applications your teams are working on.",
            "width": 1200,
            "height": 600,
            "data-ai-hint": "software applications"
        },
        "roles": {
            "src": "/roles.png",
            "alt": "Role Management",
            "caption": "Define the different roles within your teams.",
            "width": 1200,
            "height": 600,
            "data-ai-hint": "team roles"
        },
        "resources": {
            "src": "/resources.png",
            "alt": "Resource Management",
            "caption": "Manage your team members and their roles.",
            "width": 1200,
            "height": 600,
            "data-ai-hint": "user list"
        },
        "planning": {
            "src": "/planning.png",
            "alt": "Squad Planning",
            "caption": "Allocate resources to squads with dedicated or shared capacity for each sprint.",
            "width": 1200,
            "height": 700,
            "data-ai-hint": "planning board"
        },
        "tasks": {
            "src": "/tasks.png",
            "alt": "Task Management",
            "caption": "A central hub for viewing and managing all project tasks.",
            "width": 1200,
            "height": 700,
            "data-ai-hint": "task list"
        },
        "taskResourceAssignment": {
            "src": "/detailed-resource-assign.png",
            "alt": "Detailed Resource Assignment",
            "caption": "Assign specific resources and plan the exact number of days they will work on a task.",
            "width": 1200,
            "height": 700,
            "data-ai-hint": "resource allocation"
        },
        "taskDetail": {
            "src": "/task-detail.png",
            "alt": "Task Detail View",
            "caption": "Drill down into task details, update progress, and use AI-powered assistance.",
            "width": 1200,
            "height": 800,
            "data-ai-hint": "project details"
        },
        "teamAllocationReport": {
            "src": "/team-alloc-report.png",
            "alt": "Team Allocation Report",
            "caption": "A bar chart visualizing the allocation percentage of each resource.",
            "width": 1200,
            "height": 700,
            "data-ai-hint": "bar chart"
        },
        "reports": {
            "src": "/resource-task-view.png",
            "alt": "Resource View Report",
            "caption": "Analyze resource capacity, booked effort, and task assignments.",
            "width": 1200,
            "height": 700,
            "data-ai-hint": "report chart"
        }
    },
    "avatars": {
        "user": {
            "src": "/user-avatar.png",
            "alt": "User avatar",
            "width": 32,
            "height": 32,
            "data-ai-hint": "professional user"
        }
    }
};
