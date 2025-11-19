import OpenAI from "openai";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  return new OpenAI({ apiKey });
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop: string | symbol) {
    const client = getOpenAIClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

type ResponseFormat = "text" | "json_object";

export interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

export function extractTextFromResponse(response: OpenAIResponse): string | undefined {
  return response.output_text ?? response.output?.[0]?.content?.[0]?.text;
}

export async function createResponse({
  prompt,
  format = "text",
  model = "gpt-4.1-mini",
}: {
  prompt: string;
  format?: ResponseFormat;
  model?: string;
}): Promise<OpenAIResponse> {
  const params: Record<string, unknown> = {
    model,
    input: prompt,
  };

  params["response_format"] = { type: format };

  return (await openai.responses.create(params as Parameters<typeof openai.responses.create>[0])) as OpenAIResponse;
}

