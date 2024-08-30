import "@logseq/libs";
import axios from "axios";
import { systemPrompt } from "./systemPrompt";

async function generateText(prompt: string, apiKey: string) {
  if (!apiKey.trim()) {
    return "Please insert OpenAI API key in plugin settings";
  }

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
  return response.data.choices[0].message.content;
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
  ]);

  logseq.Editor.registerSlashCommand(
    "Generate Advanced Query with AI",
    async () => {
      const { content, uuid } = await logseq.Editor.getCurrentBlock();
      const generatedText = await generateText(
        content,
        logseq.settings?.apiKey,
      );
      const processedText = await processString(generatedText);
      await logseq.Editor.updateBlock(uuid, processedText);
    },
  );
}

logseq.ready(main).catch(console.error);
