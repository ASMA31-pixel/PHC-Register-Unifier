import { describe, expect, it } from "vitest";
import { findMatches, filterVisits, nextPatientId, normalizeDate, parseOcrText, toCsv, type Patient, type Visit } from "./phc";

const P = (id: string, name: string, age: number, village: string): Patient =>
  ({ patientId: id, name, age, sex: "F", village, phone: "", createdAt: "" });

describe("phc rules", () => {
  it("parses dd/mm/yyyy register dates", () => expect(normalizeDate("18/10/2026")).toBe("2026-10-18"));
  it("splits entries at each Name: line and shares header date", () => {
    const e = parseOcrText("Date: 18/10/2026\nName: Rekha Devi\nAge: 43 Sex: F\nBP: 138/88\nName: Mohan Lal\nAge: 61");
    expect(e).toHaveLength(2);
    expect(e[1].fields.name.value).toBe("Mohan Lal");
    expect(e[1].fields.date.value).toBe("2026-10-18");
    expect(e[0].fields.bp.value).toBe("138/88");
  });
  it("suggests match for similar name, age within 2, same village", () => {
    const m = findMatches({ name: "Rekha Devi", age: "43", village: "Rampur" }, [P("PHC-0001", "Rekha Devi", 42, "Rampur")]);
    expect(m[0]?.patient.patientId).toBe("PHC-0001");
  });
  it("does not match when age differs by more than 2 and village differs", () => {
    expect(findMatches({ name: "Rekha Devi", age: "60", village: "Sitapur" }, [P("PHC-0001", "Rekha Devi", 42, "Rampur")])).toHaveLength(0);
  });
  it("generates next PHC-#### id", () => expect(nextPatientId([P("PHC-0009", "A", 1, "")])).toBe("PHC-0010"));
  it("filters by program and date range", () => {
    const v = (d: string, p: Visit["program"]) => ({ date: d, program: p }) as Visit;
    expect(filterVisits([v("2026-01-01", "NCD"), v("2026-05-01", "NCD"), v("2026-05-02", "LAB")], "NCD", "2026-02-01")).toHaveLength(1);
  });
  it("escapes CSV commas", () => expect(toCsv([["a,b", "c"]])).toBe('"a,b",c'));
});
