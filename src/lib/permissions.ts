// What a signed-in user may change. Everyone signed in can view everything;
// a permission unlocks adding, editing, uploading and deleting in one area.
// Admins pass every check.

export type Permission =
  | "quotation"
  | "inward_orders"
  | "design_docs"
  | "bom"
  | "fabrication"
  | "procurement"
  | "production"
  | "testing"
  | "inspection"
  | "dispatch"
  | "commissioning"
  | "panel_tests"
  | "inventory"
  | "employees"
  | "settings";

export type PermissionInfo = { key: Permission; label: string; hint: string };

export const PERMISSION_GROUPS: { title: string; items: PermissionInfo[] }[] = [
  {
    title: "Sales",
    items: [{ key: "quotation", label: "Quotations", hint: "Create and edit quotations" }],
  },
  {
    title: "Orders",
    items: [
      {
        key: "inward_orders",
        label: "Inward orders",
        hint: "Create, edit and delete orders, upload order attachments",
      },
    ],
  },
  {
    title: "Stages",
    items: [
      { key: "design_docs", label: "Design documents", hint: "Upload and remove design documents" },
      { key: "bom", label: "BOM upload", hint: "Upload the bill of materials (inside Design)" },
      { key: "fabrication", label: "Fabrication", hint: "Fabrication and powder coating entries" },
      {
        key: "procurement",
        label: "Procurement & stock enquiry",
        hint: "Stock check, enquiries and deliveries",
      },
      { key: "production", label: "Production", hint: "Panels, jobs and assignees" },
      { key: "testing", label: "Testing", hint: "Test checklist and testing sessions" },
      { key: "inspection", label: "Inspection", hint: "Client inspection visits and outcome" },
      { key: "dispatch", label: "Dispatch", hint: "PDI, packing, transport and delivery" },
      {
        key: "commissioning",
        label: "Commissioning & Installation",
        hint: "Assign site work to engineers and rate it",
      },
    ],
  },
  {
    title: "Other",
    items: [
      {
        key: "panel_tests",
        label: "Panel tests library",
        hint: "Add panel types and the tests done on each (usually the Jr Designer)",
      },
      { key: "inventory", label: "Inventory", hint: "Import and edit inventory items" },
      { key: "employees", label: "Employees", hint: "Add and edit employees, give ratings" },
      { key: "settings", label: "Quotation settings", hint: "Companies, templates and masters" },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionInfo[] = PERMISSION_GROUPS.flatMap((g) => g.items);

export function permissionLabel(p: Permission): string {
  return ALL_PERMISSIONS.find((i) => i.key === p)?.label ?? p;
}

/** Permission that unlocks editing a stage page, by URL slug. */
export const STAGE_PERMISSION: Record<string, Permission> = {
  design: "design_docs",
  fabrication: "fabrication",
  procurement: "procurement",
  production: "production",
  testing: "testing",
  inspection: "inspection",
  dispatch: "dispatch",
  commissioning: "commissioning",
};

// What a person can see. Office staff get "view_all"; field staff see only their own
// orders, panels and tasks, plus what is ticked here. The database enforces the same rules.
export type ViewPermission = "view_all" | "view_design" | "view_equipment";

export const VIEW_PERMISSIONS: { key: ViewPermission; label: string; hint: string }[] = [
  {
    key: "view_all",
    label: "All orders (office)",
    hint: "Sees every order and the full website. Untick for field staff.",
  },
  {
    key: "view_design",
    label: "Drawings & design",
    hint: "SLD, drawings and design documents of their orders",
  },
  {
    key: "view_equipment",
    label: "Equipment & instruments",
    hint: "Material of their panels and when it will be available",
  },
];

export function viewLabel(key: string): string {
  return VIEW_PERMISSIONS.find((v) => v.key === key)?.label ?? key;
}
