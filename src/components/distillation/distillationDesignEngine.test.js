import {
  calculateDistillationDesign,
  DISTILLATION_REFERENCES,
} from "./distillationDesignEngine";

describe("industrial distillation references", () => {
  test.each(Object.entries(DISTILLATION_REFERENCES))(
    "%s reference closes its balance and produces usable equipment sizing",
    (_key, reference) => {
      const design = calculateDistillationDesign(reference.inputs);
      expect(Math.abs(design.closure)).toBeLessThan(0.001);
      expect(design.D + design.B).toBeCloseTo(design.F, 1);
      expect(design.Rmin).toBeGreaterThan(0);
      expect(design.R).toBeGreaterThan(design.Rmin);
      expect(design.Nactual).toBeGreaterThan(0);
      expect(design.Dcol).toBeGreaterThan(0);
      expect(design.Hcol).toBeGreaterThan(0);
      expect(design.Qc_kJph).toBeGreaterThan(0);
      expect(design.Qr_kJph).toBeGreaterThan(0);
      expect(design.Ac).toBeGreaterThan(0);
      expect(design.Ar).toBeGreaterThan(0);
    }
  );

  test("ethanol reference stays below the shortcut azeotropic boundary", () => {
    const design = calculateDistillationDesign({
      ...DISTILLATION_REFERENCES.ethanol.inputs,
      xD: 0.97,
    });
    expect(design.xD).toBe(0.89);
    expect(design.warnings.join(" ")).toMatch(/azeotropic/i);
  });
});

