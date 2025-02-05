import type {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
} from "@elizaos/core";
import { MusicGenProvider } from "../providers/musicgen";
import type { GenerateOptions, GenerateResponse } from "../types";
import * as fs from "fs/promises";
import path from "path";

const generateMusic: Action = {
    name: "generate",
    description: "Generate music using MusicGen AI",
    similes: [
        "CREATE_MUSIC",
        "MAKE_MUSIC",
        "COMPOSE_MUSIC",
        "GENERATE_AUDIO",
        "CREATE_SONG",
        "MAKE_SONG",
    ],

    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        console.log("[MusicGen] Validating action...");
        const token = runtime.getSetting("HUGGINGFACE_API_TOKEN");
        console.log("[MusicGen] API token exists:", !!token);
        return !!token;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            console.log("[MusicGen] Starting handler...");
            console.log("[MusicGen] State:", state);
            console.log("[MusicGen] Message content:", message.content);

            // 使用Provider.get而不是从state获取
            const provider = await MusicGenProvider.get(
                runtime,
                message,
                state
            );
            console.log("[MusicGen] Provider initialized");

            // 从message.content中提取或构造GenerateOptions
            const generateOptions: GenerateOptions = {
                prompt: message.content.text || "",
                duration: 10, // 默认10秒
                temperature: 0.8, // 默认温度
            };

            console.log("[MusicGen] message is", message);

            if (message.content.prompt) {
                // 如果有明确的prompt参数，使用它
                generateOptions.prompt = message.content.prompt;
            } else {
                // 否则，根据文本内容构造音乐生成提示词
                generateOptions.prompt = `A piano piece that expresses: ${message.content.text}`;
            }

            console.log("[MusicGen] Generate options:", generateOptions);

            if (!generateOptions.prompt) {
                throw new Error("Missing required parameter: prompt");
            }

            // 获取音频数据
            console.log("[MusicGen] Generating music...");
            const audioBuffer = await provider.generateMusic(generateOptions);
            console.log("[MusicGen] Music generated");

            // 保存音频文件
            const outputDir =
                runtime.getSetting("MUSICGEN_OUTPUT_DIR") || "./music-output";
            const fileName = `music_${Date.now()}.wav`;
            const filePath = path.join(outputDir, fileName);
            console.log("[MusicGen] Saving to:", filePath);
            await fs.writeFile(filePath, audioBuffer);
            console.log("[MusicGen] File saved");

            const response: GenerateResponse = {
                audioPath: filePath,
            };

            if (callback) {
                callback({
                    text: "Successfully generated music based on your prompt",
                    content: response,
                });
            }
            return true;
        } catch (error) {
            console.error("[MusicGen] Error details:", error);
            if (callback) {
                callback({
                    text: `Failed to generate music: ${(error as Error).message}`,
                    error: error,
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a happy piano melody",
                    prompt: "A cheerful and light piano melody with gentle rhythm",
                    duration: 10,
                    temperature: 0.8,
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll generate a happy piano melody for you.",
                    action: "generate",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully generated your piano melody.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Generate traditional Chinese music",
                    prompt: "A peaceful traditional Chinese melody with erhu and guzheng",
                    duration: 45,
                    temperature: 0.7,
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll create a traditional Chinese melody for you.",
                    action: "generate",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully generated your traditional Chinese melody.",
                },
            },
        ],
    ],
};

export default generateMusic;
