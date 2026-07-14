// Simple session-scoped password gate for privileged actions in Settings.
// Password prompt appears once per browser session; correct entry unlocks
// all subsequent add actions until the tab/session ends.
export const ADMIN_PASSWORD = "electrosoft@2025";
const KEY = "admin_pw_ok";

export function requireAdminPassword(): boolean {
  try {
    if (sessionStorage.getItem(KEY) === "1") return true;
  } catch { /* ignore */ }
  const entered = window.prompt("Enter admin password to add a new record:");
  if (entered === null) return false; // cancelled
  if (entered === ADMIN_PASSWORD) {
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    return true;
  }
  window.alert("Incorrect password.");
  return false;
}
