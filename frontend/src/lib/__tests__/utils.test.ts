import { formatDuration, formatDate, isValidUrl, formatStars } from "../utils";

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

describe("isValidUrl", () => {
  it("returns true for empty string (optional field)", () => {
    expect(isValidUrl("")).toBe(true);
  });

  it("returns true for https URL", () => {
    expect(isValidUrl("https://example.com/avatar.png")).toBe(true);
  });

  it("returns true for http URL", () => {
    expect(isValidUrl("http://example.com/avatar.png")).toBe(true);
  });

  it("returns false for javascript: protocol", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for data: protocol", () => {
    expect(isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  // --- エッジケース ---

  it("returns true for whitespace-only string (treated as empty)", () => {
    expect(isValidUrl("   ")).toBe(true);
  });

  it("returns true for URL with leading/trailing whitespace", () => {
    expect(isValidUrl("  https://example.com  ")).toBe(true);
  });

  it("handles uppercase protocols (URL constructor normalizes to lowercase)", () => {
    expect(isValidUrl("HTTPS://example.com")).toBe(true);
    expect(isValidUrl("HTTP://example.com")).toBe(true);
  });

  it("returns false for file: protocol", () => {
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
  });

  it("returns false for ftp: protocol", () => {
    expect(isValidUrl("ftp://example.com/file.txt")).toBe(false);
  });

  it("returns false for blob: protocol", () => {
    expect(isValidUrl("blob:https://example.com/uuid")).toBe(false);
  });

  it("returns true for URL with authentication info", () => {
    expect(isValidUrl("https://user:pass@example.com")).toBe(true);
  });
});

describe("formatStars", () => {
  it("returns 5 filled stars for rating 5", () => {
    expect(formatStars(5)).toBe("★★★★★");
  });

  it("returns 0 filled stars for rating 0", () => {
    expect(formatStars(0)).toBe("☆☆☆☆☆");
  });

  it("returns correct stars for rating 3", () => {
    expect(formatStars(3)).toBe("★★★☆☆");
  });

  it("clamps rating above 5 to 5", () => {
    expect(formatStars(6)).toBe("★★★★★");
  });

  it("clamps negative rating to 0", () => {
    expect(formatStars(-1)).toBe("☆☆☆☆☆");
  });

  it("rounds float rating", () => {
    expect(formatStars(3.7)).toBe("★★★★☆");
    expect(formatStars(3.2)).toBe("★★★☆☆");
  });

  it("handles NaN as 0", () => {
    expect(formatStars(NaN)).toBe("☆☆☆☆☆");
  });
});
