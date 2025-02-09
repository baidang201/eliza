import type { Action, Content, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { SunoProvider } from "../providers/suno";
import type { CustomGenerateParams } from "../types";
import { z } from "zod";
import { generateObject } from "@elizaos/core";
import { ModelClass } from "@elizaos/core";

export interface CustomGeneratePayload extends Content {
    prompt: string;
    tags: string;
    title: string;
    make_instrumental: boolean;
    model: string;
    wait_audio: boolean;
    negative_tags: string;
}

// 定义参数schema
const customGenerateSchema = z.object({
    prompt: z.string(),
    tags: z.string(),
    title: z.string(),
    make_instrumental: z.boolean().optional(),
    model: z.string().optional(),
    wait_audio: z.boolean().optional(),
    negative_tags: z.string().optional()
});

// 定义参数提取模板
const generateTemplate = `Extract music generation parameters from the following message:

{{text}}

Return a JSON object with:
- prompt: Main description or lyrics for the music
- tags: Music style tags (e.g. "electronic, dance, upbeat")
- title: Music title
- make_instrumental: (optional) Whether to make instrumental version (true/false)
- model: (optional) Model to use
- wait_audio: (optional) Whether to wait for audio completion (true/false)
- negative_tags: (optional) Tags to avoid in generation

Example:
\`\`\`json
{
    "prompt": "An upbeat electronic dance track with heavy bass",
    "tags": "electronic, dance, upbeat",
    "title": "Energetic EDM",
    "make_instrumental": false,
    "model": "chirp-v3-5",
    "wait_audio": true,
    "negative_tags": "rock, metal"
}
\`\`\`

Return ONLY the JSON object.`;

const customGenerateMusic: Action = {
    name: "custom-generate-music",
    description: "Generate music with custom parameters using Suno AI",
    similes: [
        "CREATE_CUSTOM_MUSIC",
        "GENERATE_CUSTOM_AUDIO",
        "MAKE_CUSTOM_MUSIC",
        "COMPOSE_CUSTOM_MUSIC",
        "COMPOSE_MUSIC",
        "CREATE_MUSIC",
        "GENERATE_MUSIC"

    ],

    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return !!runtime.getSetting("SUNO_API_KEY");
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const provider = await SunoProvider.get(runtime, message, state);

            // 生成context并提取参数
            const context = generateTemplate.replace(
                "{{text}}", 
                message.content.text || ""
            );

            console.log("@@@suno Generated context:", context);

            const content = await generateObject({
                runtime,
                context,
                schema: customGenerateSchema,
                modelClass: ModelClass.SMALL,
            });

            //console.log("@@@suno CREATE_CUSTOM_MUSIC content is", content);

            const customGenerateContent = content.object as CustomGeneratePayload;
            console.log("@@@suno CREATE_CUSTOM_MUSIC customGenerateContent is", customGenerateContent);

            const response = await provider.request('/api/custom_generate', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: customGenerateContent.prompt,
                    tags: customGenerateContent.tags || "chinese",
                    title: customGenerateContent.title,
                    make_instrumental: false,
                    model: "chirp-v3-5",
                    wait_audio: true,
                    negative_tags: customGenerateContent.negative_tags
                })
            });

            console.log("@@@suno CREATE_CUSTOM_MUSIC response is", response);

            if (callback) {
                callback({
                    text: 'Successfully generated custom music: ${response}',
                    content: response
                });
            }

            return true;
        } catch (error) {
            if (callback) {
                callback({
                    text: `Failed to generate custom music: ${(error as Error).message}`,
                    error: error
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
                    text: "Create an upbeat electronic dance track",
                    prompt: "An upbeat electronic dance track with heavy bass and energetic synths",
                    tags: "electronic, dance, upbeat",
                    title: "Energetic EDM",
                    make_instrumental: false
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll generate an energetic EDM track for you.",
                    action: "custom-generate-music"
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully generated your EDM track."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Generate a calm piano melody in C major",
                    prompt: "A gentle, flowing piano melody with soft dynamics",
                    duration: 45,
                    style: "classical",
                    key: "C",
                    mode: "major",
                    temperature: 0.8
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll create a calming piano piece in C major for you.",
                    action: "custom-generate-music"
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully generated your peaceful piano melody in C major."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Make a rock song with guitar solos",
                    prompt: "A rock song with powerful electric guitar solos and driving drums",
                    duration: 90,
                    style: "rock",
                    bpm: 120,
                    classifier_free_guidance: 4.0
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll generate a rock track with guitar solos for you.",
                    action: "custom-generate-music"
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully generated your rock song with guitar solos."
                }
            }
        ]
    ]
};

export default customGenerateMusic;