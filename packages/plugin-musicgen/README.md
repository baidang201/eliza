# @eliza/plugin-musicgen

A music generation plugin powered by Facebook's MusicGen model, enabling text-to-music generation through simple prompts.

## Overview

This plugin leverages Facebook's MusicGen-small model via Hugging Face's Inference API to generate unique music pieces from textual descriptions. It provides a simple yet powerful interface for AI-powered music generation.

## Installation

```bash
npm install @eliza/plugin-musicgen
```

## Configuration

The plugin requires a Hugging Face API token. You can configure it in two ways:

1. Through environment variables:

```bash
export HUGGINGFACE_API_TOKEN=your_api_token
```

2. Through character configuration:

```json
{
    "plugins": [
        {
            "name": "@eliza/plugin-musicgen",
            "config": {
                "apiToken": "your_api_token",
                "outputDir": "./music-output"
            }
        }
    ]
}
```

Note: It's recommended to use environment variables for API tokens in production.

## Quick Start

```typescript
import createPlugin from "@eliza/plugin-musicgen";

// Create plugin instance
const plugin = createPlugin({
    apiToken: "your_huggingface_token",
    outputDir: "./music-files",
});

// Generate music
const result = await plugin.generate({
    prompt: "A gentle piano solo with melancholic undertones",
    duration: 10,
    temperature: 0.8,
});

console.log("Generated audio file:", result.audioPath);
```

## Features

- Text-to-music generation using natural language prompts
- Customizable music duration and generation parameters
- Automatic audio file management
- Type-safe API interface
- Flexible output directory configuration

## API Reference

### Configuration

```typescript
interface MusicGenConfig {
    apiToken: string; // Hugging Face API token
    outputDir?: string; // Output directory path (default: "./music-output")
}
```

### Generate Options

```typescript
interface GenerateOptions {
    prompt: string; // Text description of desired music
    duration?: number; // Duration in seconds (default: 10)
    temperature?: number; // Generation randomness 0-1 (default: 0.8)
}
```

### Generate Response

```typescript
interface GenerateResponse {
    audioPath: string; // Path to generated audio file
}
```

## Error Handling

The plugin throws errors in the following cases:

- Invalid or missing API token
- Failed API requests
- File system access issues
- Invalid generation parameters

All errors include detailed error messages to help with debugging.

## Examples

### Generate Piano Music

```typescript
const result = await plugin.generate({
    prompt: "A soft piano melody with a peaceful atmosphere",
    duration: 10,
});
```

### Generate Electronic Music

```typescript
const result = await plugin.generate({
    prompt: "An energetic electronic dance track with strong beats",
    duration: 60,
    temperature: 0.9,
});
```

### Generate Orchestral Music

```typescript
const result = await plugin.generate({
    prompt: "A dramatic orchestral piece with rising tension",
    duration: 45,
    temperature: 0.7,
});
```

## Error Handling Examples

```typescript
try {
    const result = await plugin.generate({
        prompt: "A gentle melody",
        duration: 10,
    });
} catch (error) {
    if (error.message.includes("API request failed")) {
        console.error("Hugging Face API error:", error);
    } else if (error.message.includes("ENOENT")) {
        console.error("Output directory not accessible:", error);
    } else {
        console.error("Unexpected error:", error);
    }
}
```

## License

MIT

## Support

For issues and feature requests, please open an issue on our GitHub repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
