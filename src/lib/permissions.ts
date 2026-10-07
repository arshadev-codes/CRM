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
    ],
  },
  {
    title: "Other",
    items: [
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
};
