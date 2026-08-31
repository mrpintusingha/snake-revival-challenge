import re

with open('README.md', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = """# 90s Nokia Snake Challenge

Build and deploy a production-ready, mobile-first viral web experience recreating the emotional experience of playing classic monochrome mobile Snake in the late 1990s, then combining that nostalgia with a modern social competition and friend-challenge loop.

This is a paid game experience, not gambling. There are no cash prizes, no payouts, and no betting.

## ENVIRONMENTS

### DEVELOPMENT

To run locally without a real database:
`sh
npm run dev
`

### TEST

To run with real data but without live payments:
1. Ensure your .env contains Supabase credentials and DODO_WEBHOOK_SECRET.
2. Do **NOT** set DODO_PAYMENTS_API_KEY (this triggers the built-in test-mode bypass).
3. Test the flow:
   - Make test payments (they will auto-succeed).
   - Play the official game.
   - Test score validation and challenge generation.

### PRODUCTION

## SETUP STEPS

1. **Create Supabase project:** Go to Supabase and create a new project.
2. **Run database migration:** Run the provided SQL migration in supabase/migrations/20260831190321_3edfdcce-e297-432a-a503-f91b6d0c1c59.sql in the Supabase SQL Editor.
3. **Configure RLS:** Row Level Security is included in the migration and enabled by default.
4. **Configure Supabase server functions:** The server-side functions run via TanStack Start (src/lib/api.functions.ts).
5. **Configure Dodo Payments:** Create a product in Dodo Payments priced at $1. Get your Product ID.
6. **Configure Dodo webhook:** Add a webhook endpoint in Dodo pointing to https://your-domain.com/api/public/webhooks/dodo.
7. **Configure PostHog:** Create a PostHog project to get the tracking key.
8. **Add environment variables:**
   - SUPABASE_URL
   - SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - DODO_PAYMENTS_API_KEY
   - DODO_PRODUCT_ID
   - DODO_WEBHOOK_SECRET
   - VITE_POSTHOG_KEY
   - VITE_POSTHOG_HOST
   - ADMIN_PASSWORD (for the dashboard)
9. **Run locally:** Test the integration locally using ngrok for webhooks.
10. **Test payment flow:** Make a live or test payment via Dodo.
11. **Test webhook:** Verify the payment status updates in Supabase.
12. **Test official game:** Play the game and ensure session tokens are created.
13. **Test score validation:** Ensure scores correctly submit and validate.
14. **Deploy:** Deploy the application to your hosting provider (e.g., Vercel, Netlify, or Lovable).
15. **Connect custom domain:** Link your custom domain to your deployment.
"""

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(new_content)
