import { stripHtmlTags } from "./utils";

describe("stripHtmlTags", () => {
  it("p タグを除去する", () => {
    expect(stripHtmlTags("<p>テスト</p>")).toBe("テスト");
  });

  it("複数の段落タグを改行で区切る", () => {
    const input = "<p>ニッポン放送で毎週土曜</p><p>土曜日は...</p>";
    expect(stripHtmlTags(input)).toBe("ニッポン放送で毎週土曜\n\n土曜日は...");
  });

  it("a タグを除去してテキストだけ残す", () => {
    expect(stripHtmlTags('<a href="https://example.com">リンク</a>')).toBe(
      "リンク",
    );
  });

  it("タグがなければそのまま返す", () => {
    expect(stripHtmlTags("プレーンテキスト")).toBe("プレーンテキスト");
  });

  it("空文字列を返す", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("br タグを改行に置換する", () => {
    expect(stripHtmlTags("改行前<br/>改行後")).toBe("改行前\n改行後");
  });

  it("ネストしたタグを除去する", () => {
    expect(stripHtmlTags("<div><p><strong>太字</strong></p></div>")).toBe(
      "太字",
    );
  });

  it("連続する段落タグで改行が入る", () => {
    expect(stripHtmlTags("<p>前の段落</p><p>次の段落</p>")).toBe(
      "前の段落\n\n次の段落",
    );
  });

  it("連続する改行を最大2つに正規化する", () => {
    const input = "<p>段落1</p><br/><br/><br/><p>段落2</p>";
    const result = stripHtmlTags(input);
    expect(result).not.toMatch(/\n{3,}/);
    expect(result).toBe("段落1\n\n段落2");
  });

  it("行頭・行末のスペースを除去する", () => {
    const input = "<p> スペース付き </p><p> 次の段落 </p>";
    expect(stripHtmlTags(input)).toBe("スペース付き\n\n次の段落");
  });
});
