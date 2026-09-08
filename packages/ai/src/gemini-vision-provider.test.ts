import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock },
  })),
}));

// Imported after the mock so the class picks up the mocked constructor.
const { GeminiVisionProvider } = await import("./gemini-vision-provider");

const CONTEXT = { locale: "ru", unitSystem: "metric" as const };
const VALID_RESULT = {
  schemaVersion: "gemini-v1",
  items: [{ label: "Куриная грудка", estimatedGrams: 150, gramRange: [120, 180], confidence: 0.9 }],
  overallConfidence: 0.9,
};

describe("GeminiVisionProvider.analyzeMeal", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("parses a well-formed JSON response", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify(VALID_RESULT) });
    const provider = new GeminiVisionProvider({ apiKey: "test-key" });

    const result = await provider.analyzeMeal(
      { buffer: Buffer.from("fake-image"), mimeType: "image/jpeg" },
      CONTEXT,
    );

    expect(result).toEqual(VALID_RESULT);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const call = generateContentMock.mock.calls[0][0];
    expect(call.model).toBe("gemini-3.8-flash");
    expect(call.config.responseMimeType).toBe("application/json");
  });

  it("sends the image as base64 inline data with the detected mime type", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify(VALID_RESULT) });
    const provider = new GeminiVisionProvider({ apiKey: "test-key" });

    await provider.analyzeMeal({ buffer: Buffer.from("abc"), mimeType: "image/png" }, CONTEXT);

    const call = generateContentMock.mock.calls[0][0];
    const imagePart = call.contents[0].parts.find((p: { inlineData?: unknown }) => p.inlineData);
    expect(imagePart.inlineData.mimeType).toBe("image/png");
    expect(imagePart.inlineData.data).toBe(Buffer.from("abc").toString("base64"));
  });

  it("AT-010: throws (never returns a fabricated result) when Gemini's response is empty", async () => {
    generateContentMock.mockResolvedValue({ text: undefined });
    const provider = new GeminiVisionProvider({ apiKey: "test-key" });

    await expect(
      provider.analyzeMeal({ buffer: Buffer.from("x"), mimeType: "image/jpeg" }, CONTEXT),
    ).rejects.toThrow();
  });

  it("AT-010: throws when Gemini's response is not valid JSON", async () => {
    generateContentMock.mockResolvedValue({ text: "Похоже на курицу с рисом" });
    const provider = new GeminiVisionProvider({ apiKey: "test-key" });

    await expect(
      provider.analyzeMeal({ buffer: Buffer.from("x"), mimeType: "image/jpeg" }, CONTEXT),
    ).rejects.toThrow();
  });

  it("times out instead of hanging forever on a slow provider", async () => {
    generateContentMock.mockImplementation(() => new Promise(() => {})); // never resolves
    const provider = new GeminiVisionProvider({ apiKey: "test-key", timeoutMs: 20 });

    await expect(
      provider.analyzeMeal({ buffer: Buffer.from("x"), mimeType: "image/jpeg" }, CONTEXT),
    ).rejects.toThrow(/timed out/);
  });

  it("uses a configured model override instead of the default", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify(VALID_RESULT) });
    const provider = new GeminiVisionProvider({ apiKey: "test-key", model: "gemini-2.5-flash" });

    await provider.analyzeMeal({ buffer: Buffer.from("x"), mimeType: "image/jpeg" }, CONTEXT);

    expect(generateContentMock.mock.calls[0][0].model).toBe("gemini-2.5-flash");
  });
});

describe("GeminiVisionProvider.refineMeal", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("includes the previous result and correction text in the prompt", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify(VALID_RESULT) });
    const provider = new GeminiVisionProvider({ apiKey: "test-key" });

    await provider.refineMeal(
      { previousResult: VALID_RESULT, correctionText: "было 200 г" },
      CONTEXT,
    );

    const call = generateContentMock.mock.calls[0][0];
    const promptText = call.contents[0].parts[0].text as string;
    expect(promptText).toContain("было 200 г");
    expect(promptText).toContain("Куриная грудка");
  });
});
