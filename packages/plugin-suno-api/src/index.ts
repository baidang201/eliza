import type { Plugin } from "@elizaos/core";
import generateMusic from "./actions/generate";
import customGenerateMusic from "./actions/customGenerate";
import extendAudio from "./actions/extend";
import { SunoProvider } from "./providers/suno";

export {
    SunoProvider,
    generateMusic as GenerateMusic,
    customGenerateMusic as CustomGenerateMusic,
    extendAudio as ExtendAudio
};

export const sunoPluginApi: Plugin = {
    name: "suno",
    description: "Suno AI Music Generation Plugin for Eliza",
    actions: [customGenerateMusic],
    evaluators: [],
    providers: [SunoProvider],
};

export default sunoPluginApi;