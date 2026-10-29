// Run: node --test lib/utils.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { USERNAME_RE, formatPrice, isUuid, profileHref, safeRedirectPath, toUsername } from "./utils.ts";

test("safeRedirectPath keeps same-origin paths", () => {
  assert.equal(safeRedirectPath(null), "/");
  assert.equal(safeRedirectPath("/"), "/");
  assert.equal(safeRedirectPath("/settings?tab=1#a"), "/settings?tab=1#a");
});

test("safeRedirectPath rejects off-site targets", () => {
  for (const evil of [
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
  ]) {
    assert.equal(safeRedirectPath(evil), "/", evil);
  }
});

test("formatPrice formats USD and KHR ranges", () => {
  assert.equal(formatPrice(20, 50, "USD"), "$20 – $50");
  assert.equal(formatPrice(100000, 100000, "KHR"), "KHR\u00a0100,000");
});

test("profileHref prefers the username route", () => {
  assert.equal(profileHref({ id: "1b2", username: "vireak" }), "/@vireak");
  assert.equal(profileHref({ id: "1b2", username: null }), "/artists/1b2");
});

test("isUuid tells ids from usernames", () => {
  assert.ok(isUuid("a6c77d87-d904-43d9-8549-7483b03458b2"));
  assert.ok(!isUuid("vireak_heng"));
});

test("toUsername produces values the DB accepts", () => {
  assert.equal(toUsername("Vireak Heng!"), "vireakheng");
  assert.ok(USERNAME_RE.test(toUsername("Vireak_99")));
  assert.ok(!USERNAME_RE.test(toUsername("ab")));
});
