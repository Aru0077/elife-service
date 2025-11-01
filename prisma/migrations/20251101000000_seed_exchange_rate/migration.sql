-- Seed the default Mongolian togrog to Chinese yuan exchange rate.
INSERT INTO "exchange_rates" ("id", "rate", "updated_at")
VALUES ('MNT_CNY', 440.0000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
SET "rate" = EXCLUDED."rate",
    "updated_at" = CURRENT_TIMESTAMP;
