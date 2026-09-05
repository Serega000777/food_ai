import { BadRequestException, Logger, NotFoundException, type ArgumentsHost } from "@nestjs/common";

import { AllExceptionsFilter } from "./all-exceptions.filter";

function buildHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ headers: {}, method: "GET", url: "/v1/test" }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe("AllExceptionsFilter", () => {
  const filter = new AllExceptionsFilter();

  it("maps a plain HttpException to the error envelope using its status/message", () => {
    const { host, json, status } = buildHost();
    filter.catch(new NotFoundException("User not found"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NOT_FOUND", message: "User not found" }),
    );
  });

  it("passes through a structured {code, details} body unchanged (ZodValidationPipe's shape)", () => {
    const { host, json, status } = buildHost();
    filter.catch(
      new BadRequestException({ code: "VALIDATION_ERROR", details: { fieldErrors: {} } }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR", details: { fieldErrors: {} } }),
    );
  });

  it("never leaks an unexpected error's message to the client, but does log it server-side", () => {
    // The client-facing response is deliberately generic; the whole point of logging
    // server-side is that developers CAN see the real cause there — this only checks
    // that logging happens and is correlated by requestId, not that it's redacted.
    const logSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { host, json, status } = buildHost();
    filter.catch(new Error("division by zero in calculateInitialGoal"), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0] as { code: string; message: string; requestId: string };
    expect(body).toMatchObject({ code: "INTERNAL_ERROR", message: "Something went wrong" });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [logMessage] = logSpy.mock.calls[0];
    expect(logMessage).toContain(body.requestId);
    logSpy.mockRestore();
  });

  it("does not log expected HttpExceptions — only unhandled errors are noise worth a log line", () => {
    const logSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { host } = buildHost();
    filter.catch(new NotFoundException("User not found"), host);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("always includes a requestId", () => {
    const { host, json } = buildHost();
    filter.catch(new NotFoundException(), host);

    const body = json.mock.calls[0][0] as { requestId: string };
    expect(body.requestId).toEqual(expect.any(String));
    expect(body.requestId.length).toBeGreaterThan(0);
  });
});
