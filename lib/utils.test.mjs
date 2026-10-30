// Run: node --test lib/utils.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { USERNAME_RE, errorText, formatPrice, isUuid, parseSocialLinks, postImagePaths, profileHref, safeRedirectPath, toUsername, usernameError } from "./utils.ts";

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

test("errorText explains RLS rejections and passes other errors through", () => {
  assert.equal(errorText({ code: "42501", message: "new row violates row-level security policy" }, "x"), "You can't contact this person.");
  assert.equal(errorText(new Error("boom"), "fallback"), "boom");
  assert.equal(errorText("weird", "fallback"), "fallback");
  assert.equal(errorText(null, "fallback"), "fallback");
});

test("postImagePaths keeps the cover path and suffixes the rest", () => {
  assert.deepEqual(postImagePaths("u/posts/p", 1), ["u/posts/p"]);
  assert.deepEqual(postImagePaths("u/posts/p", 3), ["u/posts/p", "u/posts/p-1", "u/posts/p-2"]);
});

test("parseSocialLinks adds https:// and rejects non-links", () => {
  assert.deepEqual(parseSocialLinks("instagram.com/me\n https://x.com/me \nwww.behance.net/me"), [
    "https://instagram.com/me",
    "https://x.com/me",
    "https://www.behance.net/me",
  ]);
  for (const bad of ["javascript:alert(1)", "ftp://x.com", "hello", "@me"]) {
    assert.throws(() => parseSocialLinks(bad), undefined, bad);
  }
});

test("usernameError names only the broken rule", () => {
  assert.equal(usernameError("vireak_99"), null);
  assert.equal(usernameError(""), "Choose a username.");
  assert.equal(usernameError("ab"), "Username needs at least 3 characters.");
  assert.equal(usernameError("a".repeat(31)), "Username can be at most 30 characters.");
  assert.equal(usernameError("Bad-Name"), "Username can only use lowercase letters, numbers and _.");
});
