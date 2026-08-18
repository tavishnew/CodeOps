import { beforeEach, describe, expect, it, vi } from "vitest";

const drizzleAdapterMock = vi.fn((database: unknown, options: unknown) => ({ database, options }));
const betterAuthMock = vi.fn((options: unknown) => ({ options, api: { getSession: vi.fn() } }));

vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: drizzleAdapterMock }));
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/node", () => ({ toNodeHandler: vi.fn() }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => ({ mocked: true })) }));

describe("Better Auth Drizzle adapter configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    drizzleAdapterMock.mockClear();
    betterAuthMock.mockClear();
    process.env.DATABASE_URL = "mysql://test:test@localhost/test";
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  });

  it("passes the named Better Auth schema tables to the adapter", async () => {
    const { getBetterAuth } = await import("./_core/betterAuth");
    getBetterAuth();

    expect(drizzleAdapterMock).toHaveBeenCalledOnce();
    const [, adapterOptions] = drizzleAdapterMock.mock.calls[0] as [unknown, { schema?: Record<string, unknown> }];
    expect(adapterOptions.schema).toEqual(
      expect.objectContaining({
        user: expect.any(Object),
        session: expect.any(Object),
        account: expect.any(Object),
        verification: expect.any(Object),
      }),
    );
    expect(betterAuthMock).toHaveBeenCalledOnce();
  });
});
