import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard: the employee dashboard must NEVER render admin/manager-only
 * features. These checks parse the Portal source and verify that restricted
 * panels only appear inside AdminDashboard, not EmployeeDashboard.
 */
const source = readFileSync(resolve(__dirname, "../pages/Portal.tsx"), "utf8");

const employeeStart = source.indexOf("const EmployeeDashboard");
const employeeEnd = source.indexOf("const Portal ", employeeStart);
const employeeSection = source.slice(employeeStart, employeeEnd);

const restrictedMarkers = [
  "active-workers",     // Active workers panel
  "users\"",            // User management accordion (value="users")
  "holiday-pay",        // Holiday pay panel
  "analytics\"",        // Reporting & Analytics accordion
  "payroll-email",      // Automated payroll emails panel
  "value=\"weekly\"",   // Weekly email settings accordion
  "value=\"jobs\"",     // Job GPS pin management accordion
  "value=\"requests\"", // Time off requests panel
];

describe("employee dashboard access restrictions", () => {
  it("EmployeeDashboard section was located in Portal.tsx", () => {
    expect(employeeStart).toBeGreaterThan(-1);
    expect(employeeEnd).toBeGreaterThan(employeeStart);
  });

  for (const marker of restrictedMarkers) {
    it(`does not render restricted panel "${marker}"`, () => {
      expect(employeeSection.includes(marker)).toBe(false);
    });
  }
});
