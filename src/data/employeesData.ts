/**
 * Which list a person belongs to: "quotation" people sign quotations
 * (Prepared / Checked by); "workshop" people are the team that executes orders
 * and appear in the Employees section and stage assignee pickers.
 */
export type EmployeeScope = "quotation" | "workshop";

export interface Employee {
  id: string;
  name: string;
  designation: string;
  /** Missing means "quotation" (the only kind before the split). */
  scope?: EmployeeScope;
  phone?: string;
  department?: string;
  /** yyyy-mm-dd */
  joinedOn?: string;
  /** Missing means active. */
  active?: boolean;
}

const team = (name: string): Employee => ({
  id: name.toLowerCase().replace(/[^a-z]+/g, "-"),
  name,
  designation: "",
  scope: "workshop",
});

export const QUOTATION_SEED_IDS = ["jmk", "sb", "vk", "ap"];

export const employeesData: Employee[] = [
  { id: "jmk", name: "J.M. Krishna", designation: "Sales Engineer", scope: "quotation" },
  { id: "sb", name: "Sabir Baig", designation: "Technical Manager", scope: "quotation" },
  { id: "vk", name: "V. Kumar", designation: "Project Lead", scope: "quotation" },
  { id: "ap", name: "A. Pawar", designation: "Design Engineer", scope: "quotation" },
  ...[
    "Rahul Pawar",
    "Anees Shaikh",
    "Mubin Shaikh",
    "Saud Chaudhary",
    "Fardin Shaikh",
    "Mushtaque Shaikh",
    "Farhaan Shaikh",
    "Shahebaz Shaikh",
    "Nazeel Shaikh",
    "Nizam Shaikh",
    "Sufiyan Kotawdekar",
    "Sufiyan Shaikh",
    "Aabid Shaikh",
    "Amaan Khan",
  ].map(team),
];

export const isQuotationPerson = (e: Employee) => (e.scope ?? "quotation") === "quotation";
export const isWorkshopPerson = (e: Employee) => e.scope === "workshop";

export type RatingSource = "production" | "stage" | "qa";

export interface EmployeeRating {
  id: string;
  employeeId: string;
  stars: number;
  comment: string;
  ratedBy: string;
  createdAt: number;
  /** The finished piece of work this rating is for, if any. */
  taskRef?: { kind: RatingSource; id: string; label: string; orderId?: string };
}
