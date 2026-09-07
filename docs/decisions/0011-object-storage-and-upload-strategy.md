# ADR 0011: Object storage via server-side multipart upload, not presigned URLs

## Status

Accepted

## Context

Meal photos must live in private S3-compatible object storage, never Postgres
(master prompt §9, §25). The technical spec explicitly allows either approach: "Backend
выдаёт signed upload URL либо принимает secure multipart." Presigned direct-to-bucket
uploads avoid proxying image bytes through the API, but need CORS configured on the
bucket, a second round trip (get URL, then PUT), and more moving parts to get right in
a Telegram Mini App WebView across platforms. Server-side multipart needs none of that.

## Decision

`POST /v1/meals/photo` accepts a multipart upload directly (`@nestjs/platform-express`
`FileInterceptor`, in-memory buffer, size-capped). The API:

- validates size and MIME **and** magic bytes (never trusts the client's declared
  content-type — technical spec §25/§26);
- strips EXIF;
- generates a thumbnail (`sharp`);
- uploads both to a private MinIO/S3-compatible bucket via `@aws-sdk/client-s3`
  (the same client works against real S3 in production and MinIO locally — no
  cloud-specific code);
- returns short-lived signed **download** URLs only when the client needs to display
  the photo (`@aws-sdk/s3-request-presigner`), never a public object URL.

Object keys are random (not derived from `telegramId`/filename) so a leaked key alone
reveals nothing about the user (master prompt §10/§25).

## Consequences

- One request/response cycle for the client, no bucket CORS configuration needed.
- The API's bandwidth carries the image once (in) — acceptable at MVP photo volumes;
  if upload volume ever makes this a real cost/latency problem, switching the write
  path to presigned URLs is a contained change behind the same `POST /v1/meals/photo`
  contract (the client still gets an analysis id back either way).
- `ObjectStorageService` is a thin, provider-agnostic wrapper — swapping MinIO for a
  managed S3-compatible provider in production is a config change, not a code change.
