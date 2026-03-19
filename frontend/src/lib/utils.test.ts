import { stripHtmlTags } from "./utils";

describe("stripHtmlTags", () => {
  it("p タグを除去する", () => {
    expect(stripHtmlTags("<p>テスト</p>")).toBe("テスト");
  });

  it("複数のタグを除去する", () => {
    const input = "<p>ニッポン放送で毎週土曜</p> <p>土曜日は...</p>";
    expect(stripHtmlTags(input)).toBe("ニッポン放送で毎週土曜 土曜日は...");
  });

  it("a タグを除去してテキストだけ残す", () => {
    expect(stripHtmlTags('<a href="https://example.com">リンク</a>')).toBe("リンク");
  });

  it("タグがなければそのまま返す", () => {
    expect(stripHtmlTags("プレーンテキスト")).toBe("プレーンテキスト");
  });

  it("空文字列を返す", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("自己閉じタグを除去する", () => {
    expect(stripHtmlTags("改行前<br/>改行後")).toBe("改行前改行後");
  });

  it("ネストしたタグを除去する", () => {
    expect(stripHtmlTags("<div><p><strong>太字</strong></p></div>")).toBe("太字");
  });
});
