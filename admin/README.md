# Emad Admin App

This is a standalone admin app for managing posts, news links, and projects in Supabase.

## Setup

1. Fill in Supabase credentials in admin/config.js (see admin/config.example.js for the format).
2. Create an auth user in Supabase, then insert their id into public.admin_users.
3. Serve this folder locally (for example: `python3 -m http.server 4173`) and open the URL in your browser.

## Notes

- The app uses the public anon key plus RLS policies to enforce admin-only access.
- Draft posts stay hidden from the public blog until draft is unchecked.
- Cover uploads use the `post-covers` storage bucket.
- Preview links expire after 7 days and are generated per post.
- Future publish dates with draft unchecked become scheduled posts.
- The activity log is populated by database triggers on posts, news, and projects.
- The schedule panel shows upcoming publishes and lets you clean up expired preview links.
- News import accepts JSON arrays or CSV headers; duplicates are skipped by URL (apply `news_url_idx` from docs/supabase-schema.sql first).
