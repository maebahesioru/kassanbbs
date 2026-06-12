import { describe, it, expect } from "vitest";

import { createWriteBoardName } from "./WriteBoardName";
import { createWriteDefaultAuthorName } from "./WriteDefaultAuthorName";
import { createWriteLocalRule } from "./WriteLocalRule";
import { createWriteMaxContentLength } from "./WriteMaxContentLength";
import { createWriteNormalConfig } from "./WriteNormalConfig";

describe("WriteNormalConfig", () => {
  it("正常な値で作成できること", () => {
    const boardNameResult = createWriteBoardName("テスト掲示板");
    const localRuleResult = createWriteLocalRule("テストのルールです");
    const defaultAuthorNameResult = createWriteDefaultAuthorName("名無しさん");
    const maxContentLengthResult = createWriteMaxContentLength(1000);

    // すべての値が正常に作成されていることを確認
    expect(boardNameResult.isOk()).toBe(true);
    expect(localRuleResult.isOk()).toBe(true);
    expect(defaultAuthorNameResult.isOk()).toBe(true);
    expect(maxContentLengthResult.isOk()).toBe(true);

    if (
      boardNameResult.isOk() &&
      localRuleResult.isOk() &&
      defaultAuthorNameResult.isOk() &&
      maxContentLengthResult.isOk()
    ) {
      const result = createWriteNormalConfig({
        boardName: boardNameResult.value,
        localRule: localRuleResult.value,
        defaultAuthorName: defaultAuthorNameResult.value,
        maxContentLength: maxContentLengthResult.value,
        maxLines: 30,
        maxLineWidth: 80,
        maxAnchors: 10,
        captchaProvider: "none",
        captchaSiteKey: "",
        captchaSecretKey: "",
        enableDnsbl: false,
        dnsblHostnames: "",
        enableVpnDetection: false,
        referrerCushion: "",
        headHtml: "",
        footHtml: "",
        metaHtml: "",
        subtitle: "",
        faviconUrl: "",
        boardImageUrl: "",
        boardImageLinkUrl: "",
        bgColor: "#f3f4f6",
        textColor: "#1f2937",
        linkColor: "#7c3aed",
        nameColor: "#374151",
        enableTwitterWidgets: false,
        limitmeEnabled: false,
        limitmeFrom: 0,
        limitmeTo: 0,
        searchCaptchaEnabled: false,
        readType: "5ch",
        autoDiscoverThreads: true,
        bgColor2: "#ffffff",
        titleColor: "#000000",
        capColor: "#ff0000",
        postBgColor: "#ffffff",
        anchorColor: "#0000ff",
        indexBgColor: "#ffffff",
        createBgColor: "#ffffff",
        menuBgColor: "#ffffff",
        menuTextColor: "#000000",
        titleId: true,
        msecDisplay: false,
        hideHits: false,
        prText: "",
        prLink: "",
        maxNameLength: 20,
        maxMailLength: 50,
        maxSubjectLength: 100,
        lineMaxChars: 80,
        submax: 1000,
        datmax: 1000,
        nanashiCheck: true,
        sambaTime: 30,
        houshiTime: 60,
        tatesugiHour: 24,
        tatesugiCount: 5,
        tatesugiClose: 48,
        tatesugiCloseCount: 3,
        slipEnabled: false,
        slipDefaultLevel: "vvv",
        dispIp: false,
        beEnabled: false,
        voteEnabled: false,
        omikujiEnabled: false,
        tasukeruyoEnabled: false,
        hideOp: false,
        imgTag: false,
        twitterEmbed: false,
        movieEmbed: false,
        urlToTitle: false,
        autoFall: false,
        captchaPerBoard: "none",
        usecaptchaOnAdmin: false,
        highLight: true,
        weekdayChars: "日月火水木金土",
        tripColumn: 0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value._type).toBe("WriteNormalConfig");
        expect(result.value.boardName).toBe(boardNameResult.value);
        expect(result.value.localRule).toBe(localRuleResult.value);
        expect(result.value.defaultAuthorName).toBe(
          defaultAuthorNameResult.value
        );
        expect(result.value.maxContentLength).toBe(
          maxContentLengthResult.value
        );
        expect(result.value.captchaProvider).toBe("none");
        expect(result.value.captchaSiteKey).toBe("");
        expect(result.value.captchaSecretKey).toBe("");
        expect(result.value.enableDnsbl).toBe(false);
        expect(result.value.dnsblHostnames).toBe("");
        expect(result.value.enableVpnDetection).toBe(false);
        expect(result.value.referrerCushion).toBe("");
        expect(result.value.headHtml).toBe("");
        expect(result.value.footHtml).toBe("");
        expect(result.value.metaHtml).toBe("");
        expect(result.value.subtitle).toBe("");
        expect(result.value.faviconUrl).toBe("");
        expect(result.value.boardImageUrl).toBe("");
        expect(result.value.boardImageLinkUrl).toBe("");
        expect(result.value.bgColor).toBe("#f3f4f6");
        expect(result.value.textColor).toBe("#1f2937");
        expect(result.value.linkColor).toBe("#7c3aed");
        expect(result.value.nameColor).toBe("#374151");
        expect(result.value.enableTwitterWidgets).toBe(false);
      }
    }
  });
});
