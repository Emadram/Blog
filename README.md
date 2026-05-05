# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Deployment Notes

- GitHub Pages builds use the `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, and `PUBLIC_PLAUSIBLE_DOMAIN` secrets in `.github/workflows/deploy.yml`.
- The Search AI Edge Function reads `OPENROUTER_API_KEY` and `SERVICE_ROLE_KEY` from Supabase secrets.
- Apply `supabase/supabase-schema.sql` before deploying if you have not already created the `search_ai_queries` table.
- The **news votes** block at the end of that file adds `news_votes` and RPCs `toggle_news_vote` / `news_vote_snapshot`. Run the new section in the Supabase SQL editor after pulling changes so upvotes work in production.
- The **blog post comments** section adds `post_comments` and extends `topic_audit` with `post_id` / `post_comment_id`. Deploy the **`post-comment-submit`** Edge Function (same Supabase secrets as `comment-submit`) after applying that SQL.
