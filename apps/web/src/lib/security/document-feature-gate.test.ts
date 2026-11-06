import { describe, expect, it } from "vitest";
import { isDocumentFeatureEnabled } from "./document-feature-gate";

describe("document feature gate", () => {
  it("remains closed until a server-side scanner is implemented", () => {
    expect(isDocumentFeatureEnabled()).toBe(false);
  });
});
