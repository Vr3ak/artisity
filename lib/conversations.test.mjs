// Run: node --test lib/conversations.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { isUnread } from "./conversations.ts";

test("isUnread: newest message from the other side, past the read receipt", () => {
  assert.equal(isUnread(null, 0, "me"), false);
  assert.equal(isUnread({ id: 5, sender_id: "me" }, 0, "me"), false);
  assert.equal(isUnread({ id: 5, sender_id: "them" }, 5, "me"), false);
  assert.equal(isUnread({ id: 6, sender_id: "them" }, 5, "me"), true);
  assert.equal(isUnread({ id: 1, sender_id: "them" }, 0, "me"), true);
});
