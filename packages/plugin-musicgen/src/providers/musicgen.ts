import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import fetch from "node-fetch";
import fs from "fs/promises";
import type { GenerateOptions } from "../types";

export interface MusicGenConfig {
    /** Hugging Face API token */
    apiToken: string;
    /** Directory to save generated music files */
    outputDir?: string;
    /** API URL for the MusicGen model */
    apiUrl?: string;
}

export class MusicGenProvider implements Provider {
    private static instance: MusicGenProvider | null = null;
    private apiToken: string;
    private outputDir: string;
    //private apiUrl = "https://api-inference.huggingface.co/models/facebook/musicgen-small";

    private apiUrl =
        "https://api-inference.hf-mirror.com/models/facebook/musicgen-small";

    private constructor(config: MusicGenConfig) {
        this.apiToken = config.apiToken;
        this.outputDir = config.outputDir || "./music-output";
        if (config.apiUrl) {
            this.apiUrl = config.apiUrl;
        }
    }

    static async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state: State
    ): Promise<MusicGenProvider> {
        if (!this.instance) {
            const apiToken = runtime.getSetting("HUGGINGFACE_API_TOKEN");
            if (!apiToken) {
                throw new Error("HUGGINGFACE_API_TOKEN is not set");
            }

            const outputDir =
                runtime.getSetting("MUSICGEN_OUTPUT_DIR") || "./music-output";
            const apiUrl = runtime.getSetting("MUSICGEN_API_URL");

            this.instance = new MusicGenProvider({
                apiToken,
                outputDir,
                apiUrl,
            });

            // Initialize the provider
            await this.instance.init();
        }

        return this.instance;
    }

    async init(): Promise<void> {
        // Create output directory if it doesn't exist
        await fs.mkdir(this.outputDir, { recursive: true });
    }

    async generateMusic(options: GenerateOptions): Promise<Buffer> {
        const { prompt, duration = 10, temperature = 0.8 } = options;

        const response = await fetch(this.apiUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: duration * 50,
                    temperature: temperature,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.buffer();
    }

    async destroy(): Promise<void> {
        // Cleanup if needed
        MusicGenProvider.instance = null;
    }
}
