import { BadRequestException } from "@nestjs/common";

import { MAX_PHOTO_BYTES, validateImageBuffer } from "./image-validation";

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEADER = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBP"),
]);

describe("validateImageBuffer", () => {
  it("accepts a real JPEG regardless of what the client claims it is", () => {
    expect(validateImageBuffer(JPEG_HEADER)).toEqual({ mimeType: "image/jpeg" });
  });

  it("accepts a real PNG", () => {
    expect(validateImageBuffer(PNG_HEADER)).toEqual({ mimeType: "image/png" });
  });

  it("accepts a real WebP", () => {
    expect(validateImageBuffer(WEBP_HEADER)).toEqual({ mimeType: "image/webp" });
  });

  it("rejects a file whose magic bytes don't match any known image format", () => {
    const fakeImage = Buffer.from("this is not actually an image, just text");
    expect(() => validateImageBuffer(fakeImage)).toThrow(BadRequestException);
  });

  it("rejects an empty buffer", () => {
    expect(() => validateImageBuffer(Buffer.alloc(0))).toThrow(BadRequestException);
  });

  it("rejects a file over the size limit even with a valid header", () => {
    const oversized = Buffer.concat([JPEG_HEADER, Buffer.alloc(MAX_PHOTO_BYTES)]);
    expect(() => validateImageBuffer(oversized)).toThrow(BadRequestException);
  });

  it("rejects a PDF pretending to be a photo via extension/content-type alone", () => {
    const pdfMagic = Buffer.from("%PDF-1.4");
    expect(() => validateImageBuffer(pdfMagic)).toThrow(BadRequestException);
  });
});
