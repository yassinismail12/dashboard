import fetch from "node-fetch";

const PAGE_TOKEN = "EAAQK9ZB4dVZAkBQuxSA16Pg7K4UxPgzTZBF4i7unnshkbCZCE2ZCx9gSpxNw4G5AkAO9bBoo6IiOA4NMlZBeuIBIuqQDjMxBHA7JgagnHHBIiOhzOqN9FYX5Q9BDZBULFPKgGmydSgrfFSImMwxTFOXAXgmGPxbZAyJTgjv6ArsEN7ZBQhF3i3Ux8KZBvO3SaBmZAuTCBZCFKFyrDQZDZD";
const PAGE_ID = "776284745573463"; // from debug_token profile_id

const r = await fetch(
  `https://graph.facebook.com/v21.0/${PAGE_ID}?fields=instagram_business_account&access_token=${encodeURIComponent(PAGE_TOKEN)}`
);
console.log(await r.json());
