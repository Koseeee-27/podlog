import {
  buildMetadataDescription,
  METADATA_DESCRIPTION_MAX_LENGTH,
  pickMetadataImage,
} from "../shared";

describe("buildMetadataDescription", () => {
  const FALLBACK = "fallback text";

  describe("fallback ハンドリング", () => {
    it("rawHtml が null のとき fallback を返す", () => {
      expect(buildMetadataDescription(null, FALLBACK)).toBe(FALLBACK);
    });

    it("rawHtml が undefined のとき fallback を返す", () => {
      expect(buildMetadataDescription(undefined, FALLBACK)).toBe(FALLBACK);
    });

    it("rawHtml が空文字のとき fallback を返す", () => {
      expect(buildMetadataDescription("", FALLBACK)).toBe(FALLBACK);
    });

    it("HTML タグだけで中身が空のとき fallback を返す", () => {
      expect(buildMetadataDescription("<p></p><div></div>", FALLBACK)).toBe(
        FALLBACK,
      );
    });

    it("空白だけのとき fallback を返す", () => {
      // stripHtmlTags は前後トリムするので最終的に空文字
      expect(buildMetadataDescription("   \n  ", FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("HTML タグの除去", () => {
    it("単純な HTML タグを取り除く", () => {
      expect(
        buildMetadataDescription("<p>こんにちは</p>", FALLBACK),
      ).toBe("こんにちは");
    });

    it("リンクタグを取り除いてテキストだけ残す", () => {
      expect(
        buildMetadataDescription(
          'これは<a href="https://example.com">リンク</a>です',
          FALLBACK,
        ),
      ).toBe("これはリンクです");
    });

    it("段落タグは改行に変換される", () => {
      // stripHtmlTags は <p>/<br>/<div> 等を改行に置換する仕様
      const result = buildMetadataDescription(
        "<p>段落1</p><p>段落2</p>",
        FALLBACK,
      );
      expect(result).toContain("段落1");
      expect(result).toContain("段落2");
    });
  });

  describe("切り詰め", () => {
    it("160 文字以内ならそのまま返す（… を付けない）", () => {
      const text = "a".repeat(METADATA_DESCRIPTION_MAX_LENGTH);
      const result = buildMetadataDescription(text, FALLBACK);
      expect(result).toBe(text);
      expect(result.endsWith("…")).toBe(false);
      expect(result).toHaveLength(METADATA_DESCRIPTION_MAX_LENGTH);
    });

    it("160 文字を超えたら maxLength 文字以内に切り詰めて末尾に … を付ける", () => {
      // maxLength は最終的な返り値長の上限（… 込み）
      const text = "a".repeat(METADATA_DESCRIPTION_MAX_LENGTH + 10);
      const result = buildMetadataDescription(text, FALLBACK);
      expect(result).toHaveLength(METADATA_DESCRIPTION_MAX_LENGTH);
      expect(result.endsWith("…")).toBe(true);
      // 先頭 (maxLength - 1) 文字は元の文字列の prefix と一致する
      expect(result.slice(0, METADATA_DESCRIPTION_MAX_LENGTH - 1)).toBe(
        "a".repeat(METADATA_DESCRIPTION_MAX_LENGTH - 1),
      );
    });

    it("日本語でも文字数ベースで切り詰める", () => {
      // 日本語 1 文字を 1 として数える（bytes ではなく文字数）
      // 返り値長は maxLength 以内（"あ" × 159 + "…" = 160 文字）
      const text = "あ".repeat(200);
      const result = buildMetadataDescription(text, FALLBACK);
      expect(result).toHaveLength(METADATA_DESCRIPTION_MAX_LENGTH);
      expect(result.endsWith("…")).toBe(true);
    });

    it("maxLength 引数で上限を変更できる（… 込みで maxLength に揃う）", () => {
      const text = "abcdefghij"; // 10 文字
      // maxLength=5 のとき、"abcd" + "…" = 5 文字
      expect(buildMetadataDescription(text, FALLBACK, 5)).toBe("abcd…");
    });

    it("maxLength 引数の境界（ちょうど maxLength 文字）で … を付けない", () => {
      const text = "abcde"; // 5 文字
      expect(buildMetadataDescription(text, FALLBACK, 5)).toBe("abcde");
    });

    it("切り詰め発生時の返り値長が maxLength を超えないことを確認", () => {
      // SEO で重要な不変条件: 返り値長 <= maxLength
      const text = "x".repeat(500);
      for (const limit of [5, 10, 50, 100, 160, 200]) {
        const result = buildMetadataDescription(text, FALLBACK, limit);
        expect(result.length).toBeLessThanOrEqual(limit);
      }
    });
  });
});

describe("pickMetadataImage", () => {
  it("有効な URL 文字列をそのまま返す", () => {
    expect(pickMetadataImage("https://example.com/a.png")).toBe(
      "https://example.com/a.png",
    );
  });

  it("null は null を返す", () => {
    expect(pickMetadataImage(null)).toBeNull();
  });

  it("undefined は null を返す", () => {
    expect(pickMetadataImage(undefined)).toBeNull();
  });

  it("空文字は null を返す（?? 連結時の事故を防ぐ要件）", () => {
    expect(pickMetadataImage("")).toBeNull();
  });

  it("?? 連結で空文字を弾いて次の候補に進める", () => {
    // episode.artwork_url が空文字 → podcast.artwork_url にフォールバック
    const result =
      pickMetadataImage("") ??
      pickMetadataImage("https://example.com/podcast.png");
    expect(result).toBe("https://example.com/podcast.png");
  });
});
