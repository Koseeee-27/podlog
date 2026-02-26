import { formatDuration, formatDate } from "../utils";

describe("formatDuration", () => {
  it("returns empty string for null", () => {
    expect(formatDuration(null)).toBe("");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125000)).toBe("2:05");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatDuration(3661000)).toBe("1:01:01");
  });

  it("formats zero duration", () => {
    expect(formatDuration(0)).toBe("");
  });
});

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("formats ISO date string in Japanese locale", () => {
    const result = formatDate("2024-06-15T00:00:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("6");
    expect(result).toContain("15");
  });
});
