# Scripts

This directory contains development and analysis scripts for HealthRecon.

## Available Scripts

### `analyzeOpenAiUsage.ts`

**Purpose:** Analyze OpenAI API usage patterns across the codebase.

**Status:** ✅ Implemented

**Usage:**
```bash
npm run analyze-openai-usage
```

**What it does:**
- Scans `lib/` and `app/api/` directories for OpenAI API calls
- Identifies calls to `createResponse`, `generateJson`, and `embedText`
- Extracts model choices, configurations, and usage patterns
- Generates a comprehensive report with:
  - Total API calls found
  - Model distribution
  - Function distribution
  - Cost estimates
  - Optimization suggestions

**Example:**
```bash
$ npm run analyze-openai-usage

OpenAI Usage Analysis Report
================================================================================
Total OpenAI API calls found: 45
Files analyzed: 23
...
```

**See also:** `docs/OPENAI_TUNING_WORKFLOW.md` for detailed usage and optimization workflow.

## Future Scripts

The following scripts are planned but not yet implemented:
- Data ingestion from web sources (handled via API routes)
- Document processing (handled via `/api/process`)
- Entity extraction (handled via processing pipeline)
- Signal detection (handled via processing pipeline)

