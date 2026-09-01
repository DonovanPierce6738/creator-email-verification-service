import assert from "node:assert/strict";
import test from "node:test";
import { accessForEmailVerification } from "../src/creator_access.js";

test("creator content work stays held until email verification", () => {
  assert.deepEqual(accessForEmailVerification(false), {
    digitalAssetDelivery: "held",
    subscriberUpdates: "held",
    contentProcessing: "held",
  });

  assert.deepEqual(accessForEmailVerification(true), {
    digitalAssetDelivery: "ready",
    subscriberUpdates: "ready",
    contentProcessing: "ready",
  });
});
