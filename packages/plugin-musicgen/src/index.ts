import type { Plugin } from "@elizaos/core";
import generateMusic from "./actions/generate";
import { MusicGenProvider } from "./providers/musicgen";

// 添加调试日志
console.log("Loading @elizaos/plugin-musicgen...");
console.log("Current directory:", process.cwd());
console.log("Module path:", import.meta.url);

export const musicgenPlugin: Plugin = {
    name: "musicgen",
    description: "Music generation plugin powered by MusicGen",
    actions: [generateMusic],
    evaluators: [],
    providers: [MusicGenProvider],
};

export default musicgenPlugin;
