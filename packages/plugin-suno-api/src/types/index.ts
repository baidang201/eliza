export interface GenerateParams {
    prompt: string;
    duration?: number;
    temperature?: number;
    topK?: number;
    topP?: number;
    classifier_free_guidance?: number;
}

export interface CustomGenerateParams {
    prompt: string;
    tags: string;
    title: string;
    make_instrumental?: boolean;
    model?: string;
    wait_audio?: boolean;
    negative_tags?: string;
}

export interface ExtendParams {
    audio_id: string;
    duration: number;
}

export interface GenerationResponse {
    id: string;
    status: string;
    url?: string;
    error?: string;
}

export interface AudioInfo {
    id: string;
    title: string;
    url: string;
    status: string;
}