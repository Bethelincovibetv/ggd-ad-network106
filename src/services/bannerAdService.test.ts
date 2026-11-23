import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetSession, mockRpc, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { createBannerAdIdempotent } from "./bannerAdService";

describe("createBannerAdIdempotent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-jwt-token",
          user: { id: "user-123" },
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends Idempotency-Key header and idempotency_key payload and coalesces concurrent identical retries", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const p1 = createBannerAdIdempotent({
      idempotencyKey: "attempt-key-001",
      title: "Weekend Promo",
      target_url: "https://example.com/promo",
      duration_days: 7,
    });
    const p2 = createBannerAdIdempotent({
      idempotencyKey: "attempt-key-001",
      title: "Weekend Promo",
      target_url: "https://example.com/promo",
      duration_days: 7,
    });

    // Wait a tick for async getSession before fetch fires
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/banner-ads");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("attempt-key-001");
    expect(JSON.parse(init.body as string).idempotency_key).toBe("attempt-key-001");

    resolveFetch(
      new Response(
        JSON.stringify({
          success: true,
          already_exists: false,
          ad: { id: "ad-1", title: "Weekend Promo", target_url: "https://example.com/promo", created_at: "2026-11-23T00:00:00Z" },
          credits: 45,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r1.ad?.id).toBe("ad-1");
    expect(r2.ad?.id).toBe("ad-1");
    expect(r1.credits).toBe(45);
  });

  it("returns existing banner ad on duplicate retry without creating another", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            already_exists: false,
            ad: { id: "ad-created-99", title: "My Banner", target_url: "https://shop.ng", created_at: "2026-11-23T00:00:00Z" },
            credits: 95,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            already_exists: true,
            idempotent_replay: true,
            ad: { id: "ad-created-99", title: "My Banner", target_url: "https://shop.ng", created_at: "2026-11-23T00:00:00Z" },
            credits: 95,
          }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Idempotent-Replay": "true" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const first = await createBannerAdIdempotent({
      idempotencyKey: "retry-key-99",
      title: "My Banner",
      target_url: "https://shop.ng",
    });
    const retry = await createBannerAdIdempotent({
      idempotencyKey: "retry-key-99",
      title: "My Banner",
      target_url: "https://shop.ng",
    });

    expect(first.alreadyExists).toBe(false);
    expect(retry.alreadyExists).toBe(true);
    expect(retry.ad?.id).toBe("ad-created-99");
    expect(retry.credits).toBe(95);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fall back to direct insert when server rejects with 400 business error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: "Not enough credits. Need 5, have 2", credits: 2 }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createBannerAdIdempotent({
      idempotencyKey: "low-credit-key",
      title: "Expensive Banner",
      target_url: "https://example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not enough credits");
    expect(result.credits).toBe(2);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("falls back to atomic database RPC when /api/banner-ads returns 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    mockRpc.mockResolvedValue({
      data: {
        success: true,
        already_exists: true,
        idempotent_replay: true,
        ad: { id: "rpc-ad-1", title: "RPC Banner", target_url: "https://example.com", created_at: "2026-11-23T00:00:00Z" },
        credits: 40,
      },
      error: null,
    });

    const result = await createBannerAdIdempotent({
      idempotencyKey: "rpc-key-1",
      title: "RPC Banner",
      target_url: "https://example.com",
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(true);
    expect(result.ad?.id).toBe("rpc-ad-1");
    expect(result.credits).toBe(40);
  });
});
