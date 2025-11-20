# OpenAI Tuning & Optimization Workflow

## Overview

This document describes a **realistic, on-demand workflow** for optimizing OpenAI usage in HealthRecon using Cursor, the ADMIN OpenAI key, and available tooling. This is **not** an autonomous optimization system—all changes require explicit instructions and approval.

## Philosophy

- **On-Demand:** Optimization happens when you explicitly request it, not continuously
- **Assisted, Not Autonomous:** Cursor helps analyze and suggest, but you approve all changes
- **Data-Driven:** Decisions based on logs, metrics, and usage patterns
- **Safe:** Changes are tested and validated before deployment

## Prerequisites

1. **Admin Key Available:** `OPENAI_ADMIN_KEY` set in local `.env.local`
2. **Cursor MCP Configured:** Cursor can use OpenAI via MCP (see `docs/CURSOR_PLAN.md`)
3. **Access to Logs:** Ability to review Vercel logs or local development logs
4. **Code Access:** Full repository access for making config changes

## Workflow Steps

### Step 1: Gather Data

**Objective:** Collect information about current OpenAI usage patterns.

**What to Review:**

1. **Code Analysis:**
   - Review all OpenAI calls in `lib/openaiClient.ts`
   - Check model choices across route handlers
   - Review prompt templates and their usage
   - Identify common patterns and potential optimizations

2. **Log Analysis:**
   - Review Vercel function logs for OpenAI API calls
   - Look for:
     - Common error patterns (rate limits, timeouts)
     - Response times and latency
     - Token usage patterns
     - Model-specific issues

3. **Usage Patterns:**
   - Which routes use OpenAI most frequently?
   - What are the typical prompt sizes?
   - Are there opportunities to cache or batch requests?

**Tools:**
- `scripts/analyzeOpenAiUsage.ts` (when implemented)
- Vercel dashboard logs
- Local development logs
- Code search/grep

### Step 2: Identify Optimization Opportunities

**Objective:** Find specific areas for improvement.

**Common Optimization Areas:**

1. **Model Selection:**
   - Are expensive models used where cheaper ones would suffice?
   - Could `gpt-4.1-mini` be used instead of `gpt-4`?
   - Are embeddings using the right model (`text-embedding-3-small`)?

2. **Prompt Optimization:**
   - Can prompts be shortened without losing quality?
   - Are there redundant instructions or context?
   - Could prompts be templated more efficiently?

3. **Configuration Tuning:**
   - Temperature settings (are they optimal for each use case?)
   - Max tokens (are they too high/low?)
   - Timeout settings (are they appropriate?)

4. **Caching & Batching:**
   - Can similar requests be cached?
   - Can multiple embeddings be batched?
   - Are there duplicate API calls?

**How Cursor Can Help:**

- Analyze code patterns and suggest model changes
- Review prompts and suggest optimizations
- Compare current configs with best practices
- Identify redundant API calls

### Step 3: Propose Changes

**Objective:** Create specific, actionable change proposals.

**Format for Proposals:**

```markdown
## Proposed Change: [Title]

**Current State:**
- Model: gpt-4
- Temperature: 0.7
- Max Tokens: 2000

**Proposed Change:**
- Model: gpt-4.1-mini
- Temperature: 0.5
- Max Tokens: 1500

**Rationale:**
- [Reason 1]
- [Reason 2]

**Expected Impact:**
- Cost reduction: ~60%
- Latency: Similar or better
- Quality: Maintained

**Files to Change:**
- lib/openaiClient.ts (line X)
- lib/getSystemNarrativeContext.ts (line Y)
```

**How Cursor Can Help:**

- Generate proposals based on analysis
- Suggest specific code changes
- Estimate cost/performance impact
- Create before/after comparisons

### Step 4: Review & Approve

**Objective:** Validate proposals before implementation.

**Review Checklist:**

- [ ] Changes align with requirements
- [ ] Cost/performance trade-offs are acceptable
- [ ] Quality will be maintained
- [ ] Changes are testable
- [ ] Rollback plan exists

**Decision:** Approve, request modifications, or reject.

### Step 5: Implement Changes

**Objective:** Apply approved changes safely.

**Process:**

1. **Make Code Changes:**
   - Update config files
   - Modify prompt templates
   - Adjust model selections
   - Update timeouts/retries

2. **Test Locally:**
   - Run affected routes locally
   - Verify outputs meet quality standards
   - Check for regressions

3. **Commit & Deploy:**
   - Commit changes with clear messages
   - Deploy to preview environment
   - Monitor for issues

**How Cursor Can Help:**

- Make code edits based on approved proposals
- Update config files
- Ensure consistency across codebase
- Generate test cases

### Step 6: Monitor & Iterate

**Objective:** Verify improvements and iterate.

**Monitoring:**

1. **Immediate (First 24 hours):**
   - Check error rates
   - Monitor response times
   - Verify quality hasn't degraded

2. **Short-term (First week):**
   - Review cost metrics
   - Analyze usage patterns
   - Gather user feedback

3. **Long-term (Ongoing):**
   - Periodic optimization reviews
   - Track trends over time
   - Identify new opportunities

**Iteration:**

- If improvements are confirmed: Document and move on
- If issues arise: Rollback or adjust
- If new opportunities appear: Return to Step 1

## Example: Running a Tuning Session

### Scenario: Optimize System Narrative Generation

**Step 1: Gather Data**
```
You: "Analyze OpenAI usage for system narrative generation. 
      Review lib/getSystemNarrativeContext.ts and related routes."
```

Cursor (using ADMIN key via MCP):
- Analyzes code
- Reviews logs
- Identifies current model: `gpt-4`, temp: `0.7`, max_tokens: `2000`

**Step 2: Identify Opportunities**
```
Cursor: "Found opportunity: System narratives use gpt-4 but could use 
         gpt-4.1-mini with similar quality. Estimated cost savings: 60%."
```

**Step 3: Propose Changes**
```
Cursor: "Proposed change: Switch to gpt-4.1-mini, reduce max_tokens to 1500.
         Files: lib/openaiClient.ts, lib/getSystemNarrativeContext.ts"
```

**Step 4: Review & Approve**
```
You: "Looks good, but keep max_tokens at 2000. Proceed."
```

**Step 5: Implement**
```
Cursor: Makes code changes, updates configs
You: Test locally, verify quality
You: Commit and deploy
```

**Step 6: Monitor**
```
You: "Monitor narrative quality and costs for the next week"
```

## Tooling Scripts

### `scripts/analyzeOpenAiUsage.ts`

**Purpose:** Analyze OpenAI usage patterns from code and logs.

**Future Implementation Ideas:**

```typescript
// TODO: Implement usage analysis
// - Scan codebase for OpenAI calls
// - Extract model choices, prompt sizes, configs
// - Generate usage report
// - Suggest optimizations
```

**Usage (when implemented):**
```bash
npm run analyze-openai-usage
```

**Output:**
- Summary of OpenAI usage across codebase
- Model distribution
- Cost estimates
- Optimization suggestions

## Constraints & Limitations

### What This Workflow CANNOT Do

1. **Autonomous Changes:**
   - Cursor won't change configs without explicit instructions
   - All changes require your approval

2. **Real-Time Optimization:**
   - This is not a continuous optimization system
   - Optimization happens on-demand, when you request it

3. **Production Access:**
   - Admin key is not available in production
   - Optimization analysis happens locally or via Cursor MCP

4. **Cost Tracking:**
   - Requires manual review of OpenAI dashboard
   - No automatic cost monitoring (future enhancement)

### What This Workflow CAN Do

1. **Assisted Analysis:**
   - Cursor can analyze code and logs
   - Cursor can suggest optimizations
   - Cursor can help implement approved changes

2. **On-Demand Optimization:**
   - Run optimization sessions when needed
   - Iterate based on results
   - Document learnings

3. **Safe Changes:**
   - All changes are reviewed and approved
   - Changes are tested before deployment
   - Rollback plans exist

## Best Practices

1. **Regular Reviews:**
   - Schedule periodic optimization reviews (e.g., monthly)
   - Review after major feature additions
   - Review when costs spike

2. **Documentation:**
   - Document optimization decisions
   - Track what worked and what didn't
   - Share learnings with team

3. **Testing:**
   - Always test changes locally first
   - Deploy to preview before production
   - Monitor closely after deployment

4. **Incremental Changes:**
   - Make small, focused changes
   - Test each change before moving to the next
   - Avoid optimizing everything at once

## Related Documentation

- `docs/SECURITY_PLAN.md` - Key separation and security boundaries
- `docs/CURSOR_PLAN.md` - Cursor MCP integration setup
- `lib/config.ts` - Configuration structure
- `lib/openaiClient.ts` - OpenAI client implementation

