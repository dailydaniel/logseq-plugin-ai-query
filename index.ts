import "@logseq/libs";
import axios from "axios";
import { systemPrompt } from "./systemPrompt";
import { systemPromptCustom } from "./systemPromptCustom";

async function getCustomModelId(baseUrl: string): Promise<string> {
  try {
    const response = await axios.get(`${baseUrl}/models`, {
      headers: { "Content-Type": "application/json" },
    });
    const models = response.data.data;
    if (models && models.length > 0) {
      return models[0].id; // Возвращаем первую доступную модель
    } else {
      throw new Error("No models available on the custom server.");
    }
  } catch (error) {
    console.error("Error fetching model ID:", error);
    throw new Error("Failed to fetch model ID from the custom server.");
  }
}

async function generateText(
  prompt: string,
  apiKey: string,
  useCustomModel: boolean,
): Promise<string> {
  const baseUrl = "http://109.248.175.225:23335/v1";
  if (useCustomModel) {
    try {
      const modelId = await getCustomModelId(baseUrl);
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: modelId,
          messages: [
            { role: "system", content: systemPromptCustom },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      return (
        response.data.choices[0].message.content ||
        "Error: No content in response."
      );
    } catch (error) {
      return `Error: Unable to generate text using the custom model. ${error.message}`;
    }
  } else {
    if (!apiKey.trim()) {
      return "Please insert OpenAI API key in plugin settings";
    }
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );
      return (
        response.data.choices[0].message.content ||
        "Error: No content in response."
      );
    } catch (error) {
      return `Error: Unable to generate text using OpenAI API. ${error.message}`;
    }
  }
}

async function processString(input: string) {
  const lines = input.split("\n");

  if (
    lines[0].trim() === "```clojure" &&
    lines[lines.length - 1].trim() === "```"
  ) {
    return lines.slice(1, -1).join("\n");
  } else {
    return "Error in processing generated output\n\n" + input;
  }
}

/**
 * main entry
 */
async function main() {
  logseq.useSettingsSchema([
    {
      title: "OpenAI API key",
      description: "Insert your OpenAI API key",
      key: "apiKey",
      type: "string",
      default: "",
    },
    {
      title: "Use Special Model",
      description: "Use custom model instead of OpenAI API",
      key: "useCustomModel",
      type: "boolean",
      default: true,
    },
  ]);

  logseq.Editor.registerSlashCommand(
    "Generate Advanced Query with AI",
    async () => {
      const block = await logseq.Editor.getCurrentBlock();
      if (!block) {
        console.error("No current block found.");
        return;
      }
      const { content, uuid } = block;
      //onst { content, uuid } = await logseq.Editor.getCurrentBlock();
      const generatedText = await generateText(
        content,
        logseq.settings?.apiKey,
        logseq.settings?.useCustomModel,
      );
      const processedText = await processString(generatedText);
      await logseq.Editor.updateBlock(uuid, processedText);
    },
  );
}

logseq.ready(main).catch(console.error);
