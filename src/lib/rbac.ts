import { Role, ProjectStatus } from "@prisma/client";

export const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.SALES,
  Role.SITE_SURVEYOR,
  Role.INSTALLATION_TECH,
  Role.PROJECT_MANAGER,
  Role.ACCOUNTANT,
  Role.INVENTORY_MANAGER,
];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  SALES: "Sales Representative",
  SITE_SURVEYOR: "Site Surveyor",
  INSTALLATION_TECH: "Installation Technician",
  PROJECT_MANAGER: "Project Manager",
  ACCOUNTANT: "Accountant",
  INVENTORY_MANAGER: "Inventory Manager",
  CUSTOMER: "Customer",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PENDING: "Pending",
  SURVEY_SCHEDULED: "Survey Scheduled",
  DESIGN_COMPLETED: "Design Completed",
  APPROVED: "Approved",
  INSTALLATION_IN_PROGRESS: "Installation in Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PENDING: [ProjectStatus.SURVEY_SCHEDULED, ProjectStatus.CANCELLED],
  SURVEY_SCHEDULED: [
    ProjectStatus.DESIGN_COMPLETED,
    ProjectStatus.PENDING,
    ProjectStatus.CANCELLED,
  ],
  DESIGN_COMPLETED: [
    ProjectStatus.APPROVED,
    ProjectStatus.SURVEY_SCHEDULED,
    ProjectStatus.CANCELLED,
  ],
  APPROVED: [
    ProjectStatus.INSTALLATION_IN_PROGRESS,
    ProjectStatus.CANCELLED,
  ],
  INSTALLATION_IN_PROGRESS: [
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ],
  COMPLETED: [],
  CANCELLED: [ProjectStatus.PENDING],
};

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export type Capability =
  | "manage_users"
  | "customers_write"
  | "customers_read"
  | "surveys_write"
  | "designs_write"
  | "quotations_write"
  | "quotations_approve"
  | "projects_write"
  | "projects_assign"
  | "installations_update"
  | "installations_verify"
  | "inventory_manage"
  | "payments_write"
  | "maintenance_request"
  | "maintenance_manage"
  | "reports_view"
  | "reports_financial"
  | "reports_inventory";

const CAPABILITIES: Record<Capability, Role[]> = {
  manage_users: [Role.ADMIN],
  customers_write: [Role.ADMIN, Role.SALES],
  customers_read: [
    Role.ADMIN,
    Role.SALES,
    Role.PROJECT_MANAGER,
    Role.SITE_SURVEYOR,
    Role.ACCOUNTANT,
  ],
  surveys_write: [Role.ADMIN, Role.SITE_SURVEYOR],
  designs_write: [Role.ADMIN, Role.SALES, Role.SITE_SURVEYOR],
  quotations_write: [Role.ADMIN, Role.SALES],
  quotations_approve: [Role.ADMIN, Role.CUSTOMER, Role.SALES, Role.PROJECT_MANAGER],
  projects_write: [Role.ADMIN, Role.SALES, Role.PROJECT_MANAGER],
  projects_assign: [Role.ADMIN, Role.PROJECT_MANAGER],
  installations_update: [Role.ADMIN, Role.INSTALLATION_TECH, Role.PROJECT_MANAGER],
  installations_verify: [Role.ADMIN, Role.PROJECT_MANAGER],
  inventory_manage: [Role.ADMIN, Role.INVENTORY_MANAGER],
  payments_write: [Role.ADMIN, Role.ACCOUNTANT],
  maintenance_request: [
    Role.ADMIN,
    Role.SALES,
    Role.CUSTOMER,
    Role.PROJECT_MANAGER,
  ],
  maintenance_manage: [
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.INSTALLATION_TECH,
    Role.SITE_SURVEYOR,
  ],
  reports_view: [Role.ADMIN, Role.PROJECT_MANAGER, Role.SALES],
  reports_financial: [Role.ADMIN, Role.ACCOUNTANT, Role.PROJECT_MANAGER],
  reports_inventory: [Role.ADMIN, Role.INVENTORY_MANAGER],
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[capability]?.includes(role) ?? false;
}

export function requireRole(role: Role | undefined, allowed: Role[]) {
  if (!role || !allowed.includes(role)) {
    throw new Error("Unauthorized");
  }
}

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}
