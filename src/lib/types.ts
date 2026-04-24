export type Application = {
  id: string;
  name: string;
};

export type Role = {
  id: string;
  name: string;
};

export type Resource = {
  id: string;
  name: string;
  roleId: string;
  applicationId?: string; // Optional for cross-application resources like PMs
  userId?: string; // Links resource to a Firebase Auth user
};

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';

export type ResourceAssignment = {
  resourceId: string;
  plannedDays: number;
  startDayOffset?: number;
  status?: TaskStatus;
  progress?: number; // New field for individual progress
};

export type ImpactedApp = {
  applicationId: string;
  effortType: 'Implementation' | 'Support';
  effort: number;
  resourceAssignments: ResourceAssignment[];
};

export type Task = {
  id: string;
  referenceId?: string;
  title: string;
  description: string;
  tribeId?: string;
  squadId?: string;
  sprintId: string;
  status: string; // This will become a calculated field
  progress: number; // This will become a calculated field
  impactedApps: ImpactedApp[];
  crossFunctionalResourceAssignments?: ResourceAssignment[];
  remarks?: string;
  estimatedDays: number;
  adjustedEstimateDays?: number;
  adjustmentExplanation?: string;
  overbookingPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Sprint = {
  id:string;
  name: string;
  startDate: Date;
  endDate: Date;
};

export type Tribe = {
  id: string;
  name: string;
};

export type Squad = {
  id: string;
  name: string;
  tribeId: string;
};

export type AllocationType = 'Dedicated' | 'Shared';

export type SquadResourceAllocation = {
    id: string;
    sprintId: string;
    squadId: string;
    resourceId: string;
    allocationType: AllocationType;
    allocationPercentage?: number; // Only if shared
};


export type ImageDetails = {
    src: string;
    alt: string;
    caption: string;
    width: number;
    height: number;
    "data-ai-hint": string;
}

export type ImageData = {
    screenshots: {
        [key: string]: ImageDetails;
    },
    avatars: {
        [key: string]: ImageDetails;
    }
}

// For User Management
export type UserRole = 'Admin' | 'Manager' | 'Member' | 'Guest' | string;

export type UserRoleDoc = {
  email: string;
  role: UserRole;
};

export type AuthUser = {
    uid: string;
    email: string | undefined;
    displayName: string | undefined;
};

// For Organization Settings
export type OrganizationSettings = {
  id?: string;
  weekendDays: number[]; // 0 = Sunday, 6 = Saturday
  overbookingPercentage?: number;
};

export type Holiday = {
  id: string;
  name: string;
  date: Date;
};

// --- RBAC Types ---
export type Permission = string; // e.g., "task:create", "page:reports"

export type AccessRole = {
  id: string;
  name: UserRole;
  description: string;
  isDefault: boolean;
  permissions: Permission[];
};
