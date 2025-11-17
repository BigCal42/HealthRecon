import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

export const openai = new OpenAI({ apiKey });

type ResponseFormat = "text" | "json_object";

export async function createResponse({
  prompt,
  format = "text",
  model = "gpt-4.1-mini",
}: {
  prompt: string;
  format?: ResponseFormat;
  model?: string;
}) {
  const params: Record<string, unknown> = {
    model,
    input: prompt,
  };

  params["response_format"] = { type: format };

  return openai.responses.create(params as any);
}

