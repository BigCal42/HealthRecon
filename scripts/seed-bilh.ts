#!/usr/bin/env tsx
/**
 * Seed script for BILH (Beth Israel Lahey Health) system.
 * 
 * This script idempotently creates/updates:
 * - A `systems` row with slug 'bilh'
 * - A `system_seeds` row pointing to https://bilh.org/
 * 
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL must be set in environment
 * - SUPABASE_SERVICE_ROLE_KEY must be set in environment
 * 
 * Usage:
 *   npm run seed:bilh
 * 
 * The script is safe to run multiple times (idempotent).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is required");
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedBILH() {
  console.log("🌱 Starting BILH seed...\n");

  try {
    // Step 1: Upsert the systems row
    console.log("📝 Upserting systems row (slug: bilh)...");
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .upsert(
        {
          slug: "bilh",
          name: "Beth Israel Lahey Health",
          website: "https://bilh.org/",
          hq_city: "Boston",
          hq_state: "MA",
        },
        {
          onConflict: "slug",
        },
      )
      .select()
      .single();

    if (systemError) {
      throw new Error(`Failed to upsert system: ${systemError.message}`);
    }

    if (!system || !system.id) {
      throw new Error("System upsert returned no data");
    }

    const wasCreated = system.created_at && 
      new Date(system.created_at).getTime() > Date.now() - 5000;
    
    console.log(
      `✅ System ${wasCreated ? "created" : "updated"}: ${system.name} (ID: ${system.id})`
    );
    if (system.hq_city || system.hq_state) {
      const location = [system.hq_city, system.hq_state].filter(Boolean).join(", ");
      console.log(`   Location: ${location}`);
    }
    console.log();

    // Step 2: Upsert the system_seeds row
    console.log("📝 Upserting system_seeds row (url: https://bilh.org/)...");
    
    const seedUrl = "https://bilh.org/";
    
    // First check if a seed already exists for this system+url combination
    const { data: existingSeed } = await supabase
      .from("system_seeds")
      .select("id, label")
      .eq("system_id", system.id)
      .eq("url", seedUrl)
      .maybeSingle();

    if (existingSeed) {
      // Update label if missing
      if (!existingSeed.label) {
        const { error: updateError } = await supabase
          .from("system_seeds")
          .update({ label: "BILH Homepage" })
          .eq("id", existingSeed.id);
        
        if (updateError) {
          console.warn(`⚠️  Warning: Could not update seed label: ${updateError.message}`);
        } else {
          console.log(`✅ Seed label updated: "BILH Homepage"`);
        }
      }
      console.log(`✅ Seed already exists (ID: ${existingSeed.id})\n`);
    } else {
      const { data: seed, error: seedError } = await supabase
        .from("system_seeds")
        .insert({
          system_id: system.id,
          url: seedUrl,
          active: true,
          label: "BILH Homepage",
          priority: 1,
        })
        .select()
        .single();

      if (seedError) {
        throw new Error(`Failed to insert seed: ${seedError.message}`);
      }

      if (!seed || !seed.id) {
        throw new Error("Seed insert returned no data");
      }

      console.log(`✅ Seed created: ${seed.url} (ID: ${seed.id}, label: "${seed.label || "BILH Homepage"}")\n`);
    }

    console.log("✨ BILH seed completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Visit http://localhost:3000/systems to verify the system appears");
    console.log("  2. Visit http://localhost:3000/systems/bilh to view the system page");
    console.log("  3. Run the pipeline to start ingesting content\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

seedBILH();

