> [!IMPORTANT]
> This project is no longer connected to Lovable. It uses its own Supabase project
> (`tagqvhhnnwmgjrqkjylj`, see `.env` and `supabase/config.toml`).
>
> - Database changes go in `supabase/migrations/` and are applied with `npx supabase db push`.
> - Edge Functions live in `supabase/functions/` and deploy with `npx supabase functions deploy <name>`.
> - Never commit the Supabase secret key or database password. Function secrets are set with
>   `npx supabase secrets set`.
> - Packages are managed with npm (`package-lock.json`).
