import assert from "node:assert/strict";
import test from "node:test";

import { ResendContactProvider, type ContactProvider } from "../src/lib/server/contact-provider.ts";
import { ContactSubmissionService } from "../src/lib/server/contact-service.ts";
import { DevelopmentRateLimiter, UpstashRateLimiter, type RateLimiter } from "../src/lib/server/rate-limit.ts";
import { createContactSubmissionService, getContactFormMode } from "../src/lib/server/contact-runtime.ts";

const validInput = {
  name: "Persona de prueba",
  email: "prueba@example.test",
  phone: "",
  message: "Mensaje de prueba",
  consent: true,
  website: "",
};

class AllowingRateLimiter implements RateLimiter {
  async check() {
    return { allowed: true } as const;
  }
}

test("only reports acceptance when the provider accepts the delivery", async () => {
  const acceptedProvider: ContactProvider = { async deliver() { return { accepted: true }; } };
  const failedProvider: ContactProvider = { async deliver() { return { accepted: false }; } };

  const acceptedService = new ContactSubmissionService(acceptedProvider, new AllowingRateLimiter());
  const failedService = new ContactSubmissionService(failedProvider, new AllowingRateLimiter());

  assert.deepEqual(await acceptedService.submit(validInput, "local-test"), { status: "accepted" });
  assert.deepEqual(await failedService.submit(validInput, "local-test"), { status: "delivery-failed" });
});

test("honeypots bypass delivery and the local limiter rejects excess attempts", async () => {
  let deliveryCount = 0;
  const provider: ContactProvider = {
    async deliver() {
      deliveryCount += 1;
      return { accepted: true };
    },
  };
  const service = new ContactSubmissionService(
    provider,
    new DevelopmentRateLimiter({ maxRequests: 1, windowSeconds: 60 }),
  );

  assert.deepEqual(await service.submit({ ...validInput, website: "bot" }, "local-test"), { status: "blocked" });
  assert.equal(deliveryCount, 0);
  assert.deepEqual(await service.submit(validInput, "local-test"), { status: "accepted" });
  const blocked = await service.submit(validInput, "local-test");
  assert.equal(blocked.status, "rate-limited");
  assert.equal(deliveryCount, 1);
});

test("local preview rate limit survives service creation between requests", async () => {
  const key = "preview-persistent-test";
  for (let index = 0; index < 3; index += 1) {
    assert.equal((await createContactSubmissionService("preview").submit(validInput, key)).status, "accepted");
  }
  assert.equal(
    (await createContactSubmissionService("preview").submit(validInput, key)).status,
    "rate-limited",
  );
});

test("rate limit provider failure prevents delivery", async () => {
  let deliveries = 0;
  const provider: ContactProvider = {
    async deliver() {
      deliveries += 1;
      return { accepted: true };
    },
  };
  const failingLimiter: RateLimiter = { async check() { throw new Error("offline"); } };
  const result = await new ContactSubmissionService(provider, failingLimiter).submit(validInput, "test");
  assert.deepEqual(result, { status: "delivery-failed" });
  assert.equal(deliveries, 0);
});

test("the email adapter accepts only a provider response containing a delivery id", async () => {
  const accepted = new ResendContactProvider({
    apiKey: "test-key",
    from: "sender@example.test",
    to: "recipient@example.test",
    fetcher: async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(payload.reply_to, validInput.email);
      assert.equal(typeof payload.text, "string");
      assert.equal(payload.html, undefined);
      return Response.json({ id: "test-delivery-id" });
    },
  });
  const rejected = new ResendContactProvider({
    apiKey: "test-key",
    from: "sender@example.test",
    to: "recipient@example.test",
    fetcher: async () => Response.json({ error: "no-id" }),
  });

  assert.deepEqual(await accepted.deliver(validInput), { accepted: true });
  assert.deepEqual(await rejected.deliver(validInput), { accepted: false });
});

test("shared Redis limiter hashes the client key and rejects excess requests", async () => {
  const limiter = new UpstashRateLimiter(
    "https://rate-limit.example.test",
    "test-token",
    { maxRequests: 3, windowSeconds: 600 },
    async (_input, init) => {
      const commands = JSON.parse(String(init?.body)) as string[][];
      assert.equal(commands[0]?.[0], "INCR");
      assert.equal(commands[1]?.[0], "EXPIRE");
      assert.equal(commands[1]?.[2], 600);
      assert.notEqual(commands[0]?.[1], "test-client-key");
      return Response.json([{ result: 4 }, { result: 0 }]);
    },
  );

  assert.deepEqual(await limiter.check("test-client-key"), {
    allowed: false,
    retryAfterSeconds: 600,
  });
});

test("production stays unavailable without approved privacy and shared infrastructure", () => {
  const previousNodeEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert.equal(getContactFormMode(), "unavailable");
  process.env.NODE_ENV = previousNodeEnvironment;
});
