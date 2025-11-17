# HealthRecon

Personal intelligence layer for healthcare systems, starting with Beth Israel Lahey Health (BILH).

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode)
- **Database:** Supabase
- **Runtime:** Node.js 18+
- **Deployment:** Vercel-ready

## Project Structure

```
app/
  layout.tsx          # Root layout
  page.tsx            # Home page
  systems/
    [slug]/
      page.tsx        # Dynamic system page
lib/
  supabaseClient.ts   # Supabase client helpers
  types.ts            # Domain type definitions
config/
  constants.ts        # App constants
scripts/
  README.md           # Placeholder for ingestion scripts
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.local.example .env.local
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Pages

- **Home:** `/` - Landing page with app description
- **BILH System:** `/systems/bilh` - Beth Israel Lahey Health system page

## Domain Types

The application includes TypeScript interfaces for:

- **System** - Healthcare systems/accounts
- **Document** - Crawled pages and content
- **Entity** - People, facilities, technologies, initiatives, vendors
- **Signal** - Notable changes and events

## Next Steps

- Set up Supabase database schema
- Implement data ingestion scripts
- Add authentication
- Build entity extraction pipeline
- Implement signal detection

