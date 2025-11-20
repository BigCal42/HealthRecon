#!/usr/bin/env tsx
/**
 * OpenAI Usage Analysis Script
 * 
 * Purpose: Analyze OpenAI usage patterns across the HealthRecon codebase
 * to identify optimization opportunities.
 * 
 * Usage: npm run analyze-openai-usage
 * 
 * Note: This script uses the ADMIN OpenAI key (config.openaiAdmin.apiKey)
 * for development-time analysis only. It is NOT used by the deployed app.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

interface UsageCall {
  file: string;
  functionName: "createResponse" | "generateJson" | "embedText";
  model: string;
  format?: "text" | "json_object";
  lineNumber: number;
  hasCustomModel: boolean;
  hasCustomTimeout: boolean;
}

interface UsageStats {
  calls: UsageCall[];
  byModel: Map<string, number>;
  byFunction: Map<string, number>;
  byFile: Map<string, number>;
  totalCalls: number;
}

// Model pricing (per 1M tokens, approximate as of 2024)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4.1-mini": { input: 0.15, output: 0.60 }, // $0.15/$0.60 per 1M tokens
  "gpt-4": { input: 30.0, output: 60.0 }, // $30/$60 per 1M tokens
  "text-embedding-3-small": { input: 0.02, output: 0 }, // $0.02 per 1M tokens
  "text-embedding-3-large": { input: 0.13, output: 0 }, // $0.13 per 1M tokens
};

/**
 * Recursively find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, and other build directories
      if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === "dist") {
        continue;
      }
      files.push(...findTypeScriptFiles(fullPath, baseDir));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts") && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract OpenAI API calls from a TypeScript file
 */
function extractOpenAICalls(filePath: string, content: string): UsageCall[] {
  const calls: UsageCall[] = [];
  const lines = content.split("\n");
  const relativePath = relative(process.cwd(), filePath);

  // Pattern for createResponse calls
  const createResponsePattern = /createResponse\s*\(\s*\{[^}]*model\s*[:=]\s*["']([^"']+)["']/g;
  // Pattern for generateJson calls
  const generateJsonPattern = /generateJson\s*\(\s*\{[^}]*model\s*[:=]\s*["']([^"']+)["']/g;
  // Pattern for embedText calls
  const embedTextPattern = /embedText\s*\(\s*\{[^}]*model\s*[:=]\s*["']([^"']+)["']/g;

  // Find createResponse calls
  let match;
  while ((match = createResponsePattern.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split("\n").length;
    const model = match[1];
    
    // Check if format is specified
    const formatMatch = content.substring(match.index).match(/format\s*[:=]\s*["'](text|json_object)["']/);
    const format = formatMatch ? (formatMatch[1] as "text" | "json_object") : "text";
    
    // Check for custom timeout
    const hasCustomTimeout = /timeoutMs\s*[:=]/.test(content.substring(match.index, match.index + 500));
    
    calls.push({
      file: relativePath,
      functionName: "createResponse",
      model,
      format,
      lineNumber,
      hasCustomModel: model !== "gpt-4.1-mini",
      hasCustomTimeout,
    });
  }

  // Find generateJson calls
  while ((match = generateJsonPattern.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split("\n").length;
    const model = match[1];
    
    const hasCustomTimeout = /timeoutMs\s*[:=]/.test(content.substring(match.index, match.index + 500));
    
    calls.push({
      file: relativePath,
      functionName: "generateJson",
      model,
      format: "json_object",
      lineNumber,
      hasCustomModel: model !== "gpt-4.1-mini",
      hasCustomTimeout,
    });
  }

  // Find embedText calls
  while ((match = embedTextPattern.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split("\n").length;
    const model = match[1];
    
    const hasCustomTimeout = /timeoutMs\s*[:=]/.test(content.substring(match.index, match.index + 500));
    
    calls.push({
      file: relativePath,
      functionName: "embedText",
      model,
      lineNumber,
      hasCustomModel: model !== "text-embedding-3-small",
      hasCustomTimeout,
    });
  }

  // Also check for default model usage (no explicit model parameter)
  // This is trickier - we'll look for calls without model parameter
  const defaultCreateResponsePattern = /createResponse\s*\(\s*\{[^}]*\}/g;
  const createResponseMatches = Array.from(content.matchAll(defaultCreateResponsePattern));
  for (const defaultMatch of createResponseMatches) {
    const matchText = defaultMatch[0];
    // Only count if no model is specified
    if (!/model\s*[:=]/.test(matchText)) {
      const lineNumber = content.substring(0, defaultMatch.index).split("\n").length;
      const formatMatch = matchText.match(/format\s*[:=]\s*["'](text|json_object)["']/);
      const format = formatMatch ? (formatMatch[1] as "text" | "json_object") : "text";
      
      calls.push({
        file: relativePath,
        functionName: "createResponse",
        model: "gpt-4.1-mini", // default
        format,
        lineNumber,
        hasCustomModel: false,
        hasCustomTimeout: /timeoutMs\s*[:=]/.test(matchText),
      });
    }
  }

  const defaultGenerateJsonPattern = /generateJson\s*\(\s*\{[^}]*\}/g;
  const generateJsonMatches = Array.from(content.matchAll(defaultGenerateJsonPattern));
  for (const defaultMatch of generateJsonMatches) {
    const matchText = defaultMatch[0];
    if (!/model\s*[:=]/.test(matchText)) {
      const lineNumber = content.substring(0, defaultMatch.index).split("\n").length;
      
      calls.push({
        file: relativePath,
        functionName: "generateJson",
        model: "gpt-4.1-mini", // default
        format: "json_object",
        lineNumber,
        hasCustomModel: false,
        hasCustomTimeout: /timeoutMs\s*[:=]/.test(matchText),
      });
    }
  }

  const defaultEmbedTextPattern = /embedText\s*\(\s*\{[^}]*\}/g;
  const embedTextMatches = Array.from(content.matchAll(defaultEmbedTextPattern));
  for (const defaultMatch of embedTextMatches) {
    const matchText = defaultMatch[0];
    if (!/model\s*[:=]/.test(matchText)) {
      const lineNumber = content.substring(0, defaultMatch.index).split("\n").length;
      
      calls.push({
        file: relativePath,
        functionName: "embedText",
        model: "text-embedding-3-small", // default
        lineNumber,
        hasCustomModel: false,
        hasCustomTimeout: /timeoutMs\s*[:=]/.test(matchText),
      });
    }
  }

  return calls;
}

/**
 * Build usage statistics from calls
 */
function buildUsageStats(calls: UsageCall[]): UsageStats {
  const byModel = new Map<string, number>();
  const byFunction = new Map<string, number>();
  const byFile = new Map<string, number>();

  for (const call of calls) {
    byModel.set(call.model, (byModel.get(call.model) ?? 0) + 1);
    byFunction.set(call.functionName, (byFunction.get(call.functionName) ?? 0) + 1);
    byFile.set(call.file, (byFile.get(call.file) ?? 0) + 1);
  }

  return {
    calls,
    byModel,
    byFunction,
    byFile,
    totalCalls: calls.length,
  };
}

/**
 * Generate optimization suggestions
 */
function generateSuggestions(stats: UsageStats): string[] {
  const suggestions: string[] = [];

  // Check for expensive models
  const expensiveModels = ["gpt-4"];
  for (const [model, count] of stats.byModel.entries()) {
    if (expensiveModels.includes(model)) {
      suggestions.push(
        `Consider using gpt-4.1-mini instead of ${model} (found ${count} calls). Estimated cost savings: ~95%`,
      );
    }
  }

  // Check for non-default models that might be unnecessary
  const customModelCalls = stats.calls.filter((c) => c.hasCustomModel);
  if (customModelCalls.length > 0) {
    suggestions.push(
      `Found ${customModelCalls.length} calls with custom models. Review if defaults would suffice.`,
    );
  }

  // Check embedding model usage
  const embeddingCalls = stats.calls.filter((c) => c.functionName === "embedText");
  const nonDefaultEmbedding = embeddingCalls.filter((c) => c.model !== "text-embedding-3-small");
  if (nonDefaultEmbedding.length > 0) {
    suggestions.push(
      `Found ${nonDefaultEmbedding.length} embedding calls using non-default model. text-embedding-3-small is typically sufficient.`,
    );
  }

  // Check for batching opportunities
  const embedTextCalls = stats.calls.filter((c) => c.functionName === "embedText");
  if (embedTextCalls.length > 10) {
    suggestions.push(
      `Found ${embedTextCalls.length} embedText calls. Consider batching multiple texts in single calls where possible.`,
    );
  }

  // Check for files with many calls
  const filesWithManyCalls = Array.from(stats.byFile.entries())
    .filter(([_, count]) => count > 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (filesWithManyCalls.length > 0) {
    suggestions.push(
      `Files with high OpenAI usage: ${filesWithManyCalls.map(([file, count]) => `${file} (${count})`).join(", ")}. Consider caching or optimization.`,
    );
  }

  return suggestions;
}

/**
 * Generate cost estimate (rough)
 */
function estimateCost(stats: UsageStats): { total: number; byModel: Map<string, number> } {
  const byModelCost = new Map<string, number>();
  let totalCost = 0;

  // Rough estimate: assume average prompt is 2000 tokens, response is 500 tokens
  const avgInputTokens = 2000;
  const avgOutputTokens = 500;

  for (const [model, count] of stats.byModel.entries()) {
    const pricing = MODEL_PRICING[model];
    if (pricing) {
      // For embeddings, only input tokens matter
      if (model.includes("embedding")) {
        const cost = (count * avgInputTokens * pricing.input) / 1_000_000;
        byModelCost.set(model, cost);
        totalCost += cost;
      } else {
        // For completions, both input and output
        const inputCost = (count * avgInputTokens * pricing.input) / 1_000_000;
        const outputCost = (count * avgOutputTokens * pricing.output) / 1_000_000;
        const cost = inputCost + outputCost;
        byModelCost.set(model, cost);
        totalCost += cost;
      }
    }
  }

  return { total: totalCost, byModel: byModelCost };
}

/**
 * Generate and print report
 */
function generateReport(stats: UsageStats): void {
  console.log("\n" + "=".repeat(80));
  console.log("OpenAI Usage Analysis Report");
  console.log("=".repeat(80) + "\n");

  // Summary
  console.log("SUMMARY");
  console.log("-".repeat(80));
  console.log(`Total OpenAI API calls found: ${stats.totalCalls}`);
  console.log(`Files analyzed: ${stats.byFile.size}`);
  console.log(`Unique models used: ${stats.byModel.size}`);
  console.log();

  // Model distribution
  console.log("MODEL DISTRIBUTION");
  console.log("-".repeat(80));
  const sortedModels = Array.from(stats.byModel.entries()).sort((a, b) => b[1] - a[1]);
  for (const [model, count] of sortedModels) {
    const percentage = ((count / stats.totalCalls) * 100).toFixed(1);
    console.log(`  ${model.padEnd(30)} ${count.toString().padStart(5)} calls (${percentage}%)`);
  }
  console.log();

  // Function distribution
  console.log("FUNCTION DISTRIBUTION");
  console.log("-".repeat(80));
  const sortedFunctions = Array.from(stats.byFunction.entries()).sort((a, b) => b[1] - a[1]);
  for (const [func, count] of sortedFunctions) {
    const percentage = ((count / stats.totalCalls) * 100).toFixed(1);
    console.log(`  ${func.padEnd(30)} ${count.toString().padStart(5)} calls (${percentage}%)`);
  }
  console.log();

  // Cost estimate
  const costEstimate = estimateCost(stats);
  console.log("COST ESTIMATE (per 1M requests, rough)");
  console.log("-".repeat(80));
  console.log(`Total estimated cost: $${costEstimate.total.toFixed(2)}`);
  console.log();
  for (const [model, cost] of Array.from(costEstimate.byModel.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${model.padEnd(30)} $${cost.toFixed(2)}`);
  }
  console.log();

  // Top files by usage
  console.log("TOP FILES BY USAGE");
  console.log("-".repeat(80));
  const topFiles = Array.from(stats.byFile.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [file, count] of topFiles) {
    console.log(`  ${file.padEnd(60)} ${count.toString().padStart(5)} calls`);
  }
  console.log();

  // Optimization suggestions
  const suggestions = generateSuggestions(stats);
  if (suggestions.length > 0) {
    console.log("OPTIMIZATION SUGGESTIONS");
    console.log("-".repeat(80));
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
    console.log();
  }

  console.log("=".repeat(80));
  console.log("Analysis complete. See docs/OPENAI_TUNING_WORKFLOW.md for optimization workflow.");
  console.log("=".repeat(80) + "\n");
}

/**
 * Analyze OpenAI usage patterns in the codebase.
 */
// Simple logger for script (avoids importing config)
const scriptLogger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (error: unknown, message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, error, ...args);
  },
};

async function analyzeOpenAiUsage() {
  scriptLogger.info("Starting OpenAI usage analysis...");

  // Check if admin key is available (optional - script works without it)
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) {
    scriptLogger.info(
      "OPENAI_ADMIN_KEY not set. Running code-only analysis (no OpenAI API calls needed).",
    );
  }

  try {
    // Scan lib/ and app/api/ directories
    const libFiles = findTypeScriptFiles(join(process.cwd(), "lib"));
    const apiFiles = findTypeScriptFiles(join(process.cwd(), "app", "api"));

    scriptLogger.info(`Scanning ${libFiles.length} files in lib/`);
    scriptLogger.info(`Scanning ${apiFiles.length} files in app/api/`);

    const allCalls: UsageCall[] = [];

    // Process lib files
    for (const file of libFiles) {
      try {
        const content = readFileSync(file, "utf-8");
        const calls = extractOpenAICalls(file, content);
        allCalls.push(...calls);
      } catch (error) {
        scriptLogger.warn(`Failed to read ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Process API files
    for (const file of apiFiles) {
      try {
        const content = readFileSync(file, "utf-8");
        const calls = extractOpenAICalls(file, content);
        allCalls.push(...calls);
      } catch (error) {
        scriptLogger.warn(`Failed to read ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    scriptLogger.info(`Found ${allCalls.length} OpenAI API calls`);

    // Build statistics
    const stats = buildUsageStats(allCalls);

    // Generate and print report
    generateReport(stats);

    scriptLogger.info("Analysis complete.");
  } catch (error) {
    scriptLogger.error(error, "Failed to analyze OpenAI usage");
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  analyzeOpenAiUsage().catch((error) => {
    scriptLogger.error(error, "Failed to analyze OpenAI usage");
    process.exit(1);
  });
}

export { analyzeOpenAiUsage };
