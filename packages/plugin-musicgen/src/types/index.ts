export interface MusicGenConfig {
    apiToken: string;
    outputDir?: string;
}

export interface GenerateOptions {
    prompt: string;
    duration?: number; // 音乐时长(秒)
    temperature?: number; // 生成随机性 0-1
}

export interface GenerateResponse {
    audioPath: string; // 生成的音频文件路径
}

export interface MusicGenProvider {
    generateMusic(options: GenerateOptions): Promise<Buffer>;
}
