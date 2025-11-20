# Cursor MCP OpenAI Integration Plan

## Overview

This document describes how Cursor's Model Context Protocol (MCP) integrates with OpenAI for HealthRecon development workflows, using the ADMIN OpenAI key securely.

## Purpose

Cursor MCP OpenAI integration enables:
- AI-assisted code editing and refactoring
- Prompt and configuration optimization suggestions
- Development-time analysis and tooling
- Safe, controlled access to OpenAI without exposing keys

**Important:** This integration is for **development only**. The deployed HealthRecon app uses its own APP key independently.

## Configuration

### Prerequisites

1. **Admin OpenAI Key:** You must have `OPENAI_ADMIN_KEY` set in your local environment (`.env.local`)
2. **Cursor MCP Server:** Cursor must be configured to use the OpenAI MCP server
3. **Environment Access:** The MCP server must be able to read `OPENAI_ADMIN_KEY` from the environment

### MCP Server Configuration

**DO NOT** paste the admin key directly into Cursor configuration files or prompts.

Instead, configure Cursor's OpenAI MCP server to:

1. **Read from environment:** Reference `OPENAI_ADMIN_KEY` from your system environment
2. **Use secure storage:** Leverage Cursor's secret management (if available)
3. **Never hardcode:** Never include the key in JSON config files or code

### Example MCP Configuration Pattern

```json
{
  "mcpServers": {
    "openai": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-openai"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_ADMIN_KEY}"
      }
    }
  }
}
```

**Note:** The exact configuration format depends on Cursor's MCP implementation. The key principle is: **reference the environment variable, don't paste the key**.

## Key Separation

### Cursor Uses ADMIN Key

- Cursor MCP calls use `OPENAI_ADMIN_KEY` (from environment)
- This key is **never** used by the HealthRecon app runtime
- This key is **never** deployed to Vercel

### App Uses APP Key

- HealthRecon app runtime uses `OPENAI_API_KEY` (from environment)
- This key is configured in Vercel for production
- This key is **never** used by Cursor MCP

### Clear Boundaries

```
┌─────────────────────────────────────┐
│  Cursor MCP (Development)          │
│  Uses: OPENAI_ADMIN_KEY            │
│  Purpose: Code assistance          │
└─────────────────────────────────────┘
              │
              │ (separate keys)
              │
┌─────────────────────────────────────┐
│  HealthRecon App (Runtime)          │
│  Uses: OPENAI_API_KEY               │
│  Purpose: Chat, RAG, narratives     │
└─────────────────────────────────────┘
```

## Usage Workflows

### 1. Code Editing Assistance

When you ask Cursor to help edit HealthRecon code:
- Cursor uses its MCP OpenAI integration (ADMIN key)
- Cursor can analyze code, suggest improvements, refactor
- Cursor **never** needs to know the APP key
- The app continues using its own APP key independently

### 2. Configuration Optimization

When you run optimization workflows (see `docs/OPENAI_TUNING_WORKFLOW.md`):
- Tooling scripts can use `config.openaiAdmin.apiKey` (if present)
- Cursor can help analyze logs and suggest config changes
- All changes are made via explicit prompts/instructions (no autonomous changes)

### 3. Prompt Engineering

When testing or optimizing prompts:
- Use Cursor MCP to test prompt variations
- Use admin key for development-time testing
- Production app uses tested prompts with APP key

## Security Considerations

### What Cursor CAN Do

- ✅ Read code and suggest edits
- ✅ Use ADMIN key for development-time OpenAI calls
- ✅ Help analyze logs and metrics
- ✅ Suggest configuration improvements
- ✅ Run tooling scripts that use admin key

### What Cursor CANNOT Do

- ❌ Access the APP key (not needed)
- ❌ Make autonomous changes without explicit instructions
- ❌ Modify production configs without approval
- ❌ Expose keys in generated code or documentation

### Guardrails

1. **Explicit Instructions Required:**
   - Cursor won't autonomously change configs
   - All changes require explicit user prompts
   - Optimization workflows are on-demand, not continuous

2. **Key Isolation:**
   - Cursor MCP uses ADMIN key only
   - App code uses APP key only
   - No cross-contamination

3. **No Secret Exposure:**
   - Cursor never pastes keys into code
   - Cursor never logs keys
   - Cursor never commits keys to git

## Troubleshooting

### Cursor MCP Not Working

1. **Check Environment:**
   ```bash
   echo $OPENAI_ADMIN_KEY  # Should show key (not empty)
   ```

2. **Verify MCP Config:**
   - Ensure Cursor MCP server is configured correctly
   - Ensure it references `OPENAI_ADMIN_KEY` from environment
   - Never paste key directly into config

3. **Check Cursor Logs:**
   - Review Cursor's MCP connection logs
   - Verify OpenAI API calls are using admin key

### Admin Key Not Found

- **Local Dev:** Ensure `OPENAI_ADMIN_KEY` is in `.env.local`
- **Not Required:** App runs fine without admin key (it's optional)
- **Tooling Only:** Admin key is only needed for Cursor MCP and tooling scripts

## Related Documentation

- `docs/SECURITY_PLAN.md` - Overall security strategy and key separation
- `docs/OPENAI_TUNING_WORKFLOW.md` - Optimization workflows using admin key
- `lib/config.ts` - Config module with key separation

