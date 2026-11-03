// Test data for the LOCAL stack only: artists, a client, services and posts with images.
// Run: npm run seed:local   (re-running replaces the previous seed users)
//
// This is deliberately not in supabase/seed.sql: that file also runs on hosted preview
// branches and `db push --include-seed`. This script refuses any non-local Supabase URL.
// Seed users have @seed.test emails; they all share PASSWORD below.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  console.error(`Refusing to seed: NEXT_PUBLIC_SUPABASE_URL is ${url ?? "unset"}, not the local stack.`);
  process.exit(1);
}
if (!key) {
  console.error("SUPABASE_SECRET_KEY is unset; copy it from `npx supabase status`.");
  process.exit(1);
}

const PASSWORD = "seed-password-123";
const DOMAIN = "@seed.test";
const BUCKET = "profile-images";
const db = createClient(url, key, { auth: { persistSession: false } });
const publicUrl = (path) => `${url}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;
const day = 86400000;
const SHAPES = [[1200, 1600], [1600, 900], [1200, 1200], [1000, 1500], [1600, 1200], [900, 1600]];

const ARTISTS = [
  {
    name: "Sokha Chan", username: "sokha_draws", location: "Phnom Penh",
    bio: "Illustrator and concept artist. Temples, folklore and soft light.",
    services: [["illustration", "USD", 30, 120], ["scene_concept_art", "USD", 80, 300]],
    posts: [
      ["Moonlit temple, a scene study", "scene_concept_art", 3],
      ["Apsara portrait commission", "illustration", 1],
      ["River market at dusk", "illustration", 2],
    ],
  },
  {
    name: "Dara Kim", username: "darakim", location: "Siem Reap",
    bio: "Emotes and stream overlays for Khmer streamers.",
    services: [["emote", "USD", 10, 40], ["streaming_asset", "USD", 40, 150]],
    posts: [
      ["Emote set for a Khmer streamer", "emote", 4],
      ["Neon stream overlay", "streaming_asset", 1],
    ],
  },
  {
    name: "Bopha Lim", username: "bopha_studio", location: "Battambang",
    bio: "Branding for cafés, restaurants and small shops.",
    services: [["branding_graphic", "KHR", 400000, 2000000], ["ui_ux", "USD", 150, 600]],
    posts: [
      ["Café rebrand: logo, menu and cups", "branding_graphic", 3],
      ["Booking app screens for a spa", "ui_ux", 2],
    ],
  },
  {
    name: "Rithy Sok", username: "rithy3d", location: "Kampot",
    bio: "3D characters and game-ready props.",
    services: [["model_3d_2d", "USD", 60, 400], ["game_asset", "USD", 25, 200]],
    posts: [
      ["River spirit character sheet with turnarounds and colour variants", "model_3d_2d", 2],
      ["Low-poly market stall props", "game_asset", 1],
    ],
  },
  {
    name: "Malis Heng", username: "malis_motion", location: "Phnom Penh",
    bio: "Short animations and motion graphics.",
    services: [["video_animation", "USD", 100, 800]],
    posts: [["Water festival animated poster", "video_animation", 1]],
  },
];

const CLIENT = { name: "Test Client", username: "test_client" };

const check = (res) => {
  if (res.error) throw res.error;
  return res.data;
};

// picsum.photos placeholder images, seeded so every run gets the same picture per path
async function upload(path, seed, w, h) {
  const res = await fetch(`https://picsum.photos/seed/${seed}/${w}/${h}.jpg`);
  if (!res.ok) throw new Error(`picsum ${res.status} for ${seed}`);
  check(await db.storage.from(BUCKET).upload(path, await res.arrayBuffer(), { contentType: "image/jpeg", upsert: true }));
}

async function removeOldSeed() {
  const { users } = check(await db.auth.admin.listUsers({ perPage: 1000 }));
  for (const u of users.filter((u) => u.email?.endsWith(DOMAIN))) {
    const posts = check(await db.storage.from(BUCKET).list(`${u.id}/posts`, { limit: 1000 }));
    const paths = [`${u.id}/avatar`, `${u.id}/cover`, ...posts.map((f) => `${u.id}/posts/${f.name}`)];
    check(await db.storage.from(BUCKET).remove(paths));
    check(await db.auth.admin.deleteUser(u.id)); // profiles, services, posts cascade
  }
}

async function createUser({ name, username }) {
  const { user } = check(
    await db.auth.admin.createUser({
      email: `${username}${DOMAIN}`,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    }),
  );
  return user.id;
}

await removeOldSeed();

for (const [i, a] of ARTISTS.entries()) {
  const id = await createUser(a);
  await upload(`${id}/avatar`, `${a.username}-avatar`, 256, 256);
  await upload(`${id}/cover`, `${a.username}-cover`, 1600, 400);
  check(
    await db.from("profiles").update({
      role: "artist",
      username: a.username,
      bio: a.bio,
      location: a.location,
      categories: a.services.map(([c]) => c),
      avatar_url: publicUrl(`${id}/avatar`),
      cover_url: publicUrl(`${id}/cover`),
      created_at: new Date(Date.now() - (60 + i) * day).toISOString(),
    }).eq("id", id),
  );
  check(
    await db.from("services").insert(
      a.services.map(([category, currency, price_min, price_max]) => ({ artist_id: id, category, currency, price_min, price_max })),
    ),
  );
  for (const [j, [title, category, count]] of a.posts.entries()) {
    const postId = crypto.randomUUID();
    const path = `${id}/posts/${postId}`;
    // Mixed shapes so the masonry feed has something to balance
    const [w, h] = SHAPES[(i * 3 + j) % SHAPES.length];
    for (let n = 0; n < count; n++) await upload(n ? `${path}-${n}` : path, `${postId}-${n}`, w, h);
    check(
      await db.from("posts").insert({
        id: postId, artist_id: id, image_path: path, image_count: count, title, category,
        caption: `Seed post for local testing (${count} image${count > 1 ? "s" : ""}).`,
        // Interleaved by artist, one post every ~14 hours going back
        created_at: new Date(Date.now() - ((j * ARTISTS.length + i) * 0.6 * day + 2 * 3600000)).toISOString(),
      }),
    );
  }
  console.log(`artist  ${a.username}${DOMAIN}  (${a.posts.length} posts)`);
}

const clientId = await createUser(CLIENT);
check(await db.from("profiles").update({ role: "client", username: CLIENT.username, categories: ["illustration"] }).eq("id", clientId));
console.log(`client  ${CLIENT.username}${DOMAIN}`);
console.log(`Done. Every seed user's password is PASSWORD in scripts/seed-local.mjs.`);
