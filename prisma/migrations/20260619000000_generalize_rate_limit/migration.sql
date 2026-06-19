-- Generalize the waitlist-only rate limiter into a shared RateLimit table keyed
-- by an opaque caller-built `key`. The old counters are disposable (a stale
-- fixed window is simply overwritten on the next request), so dropping them has
-- no lasting effect beyond resetting in-flight windows.

-- DropTable
DROP TABLE "WaitlistRateLimit";

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
