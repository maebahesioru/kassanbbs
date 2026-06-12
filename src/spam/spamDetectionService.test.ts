import { describe, it, expect } from "vitest";

import { calculateSpamScore } from "./spamDetectionService";

describe("calculateSpamScore", () => {
  it("通常のテキストは低スコアになること", () => {
    const score = calculateSpamScore(
      "今日はいい天気ですね。散歩に行きましょう。",
      "名無しさん",
      ""
    );

    expect(score).toBeLessThan(3);
  });

  it("URLが多いテキストは高スコアになること", () => {
    const score = calculateSpamScore(
      "Check out https://example.com and https://spam.com/buy and https://evil.com/click",
      "名無しさん",
      ""
    );

    expect(score).toBeGreaterThanOrEqual(3);
  });

  it("スパムキーワードを含むテキストは高スコアになること", () => {
    const score = calculateSpamScore(
      "Buy now! Earn money fast! Click here for free money!",
      "名無しさん",
      ""
    );

    expect(score).toBeGreaterThanOrEqual(6);
  });

  it("authorNameにURLが含まれる場合は高スコアになること", () => {
    const score = calculateSpamScore(
      "通常のテキスト",
      "https://spam.com",
      ""
    );

    expect(score).toBeGreaterThanOrEqual(5);
  });

  it("短すぎるテキストはスコアが加算されること", () => {
    const score = calculateSpamScore("a", "名無しさん", "");

    expect(score).toBeGreaterThanOrEqual(2);
  });

  it("ASCII比率が高いテキストはスコアが加算されること", () => {
    const score = calculateSpamScore(
      "abcde12345abcde12345abcde12345abcde12345abcde12345abcde12345abcde12345",
      "名無しさん",
      ""
    );

    expect(score).toBeGreaterThanOrEqual(1);
  });

  it("連続する文字でスコアが加算されること", () => {
    const score = calculateSpamScore("aaaaa", "名無しさん", "");

    expect(score).toBeGreaterThanOrEqual(2);
  });

  it("メールにフリーメールドメインがある場合でスコアが既に高いと加算されること", () => {
    const score = calculateSpamScore(
      "buy now casino viagra",
      "https://spam.com",
      "spam@gmail.com"
    );

    expect(score).toBeGreaterThanOrEqual(10);
  });

  it("空のコンテンツはスコアが加算されること", () => {
    const score = calculateSpamScore("", "名無しさん", "");

    expect(score).toBeGreaterThanOrEqual(2);
  });
});
