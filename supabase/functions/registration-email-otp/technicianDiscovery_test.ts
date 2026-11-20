import { filterRelevantTechnicians } from "./index.ts";

Deno.test("farmer technician discovery matches any owned animal and keeps availability states", () => {
  const technicians = [
    { id: "pig", role: "technician", status: "active", qualificationVerified: true, qualificationKeys: ["pig:2"], available: true },
    { id: "cattle", role: "technician", status: "active", qualificationVerified: true, qualificationKeys: ["cattle:1"], available: false },
    { id: "goat", role: "technician", status: "active", qualificationVerified: true, qualificationKeys: ["goat:2"] },
    { id: "pending", role: "technician", status: "pending", qualificationVerified: true, qualificationKeys: ["pig:2"] },
    { id: "unverified", role: "technician", status: "active", qualificationVerified: false, qualificationKeys: ["pig:2"] },
  ];

  assertEquals(filterRelevantTechnicians(technicians, new Set(["pig", "cattle"])).map(tech => tech.id), ["pig", "cattle"]);
});

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
