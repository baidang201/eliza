import type {
    Action,
    Content,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
} from "@elizaos/core";
import { walletProvider } from "../providers/wallet";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import type { MintNFTOptions } from "../types";
import { parseAccount, SuiNetwork } from "../utils";
import { generateObject, ModelClass } from "@elizaos/core";
import { z } from "zod";

export interface MintNFTPayload extends Content {
    name: string;
    description: string;
    url: string;
}

// 定义NFT参数提取模板
const mintTemplate = `Extract NFT information from the following message:

{{text}}

Return a JSON object with:
- name: NFT name
- description: NFT content or description
- url: NFT URL

Example:
\`\`\`json
{
    "name": "Spring Poem",
    "description": "A beautiful poem about spring",
    "url": "ipfs://QmXXX..."
}
\`\`\`

Return ONLY the JSON object.`;

// 使用zod定义NFT参数schema
const mintSchema = z.object({
    name: z.string(),
    description: z.string(),
    url: z.string()
});

const mintNFT: Action = {
    name: "mint",
    description: "Mint NFT on Sui blockchain",
    similes: ["MINT_NFT", "CREATE_NFT", "GENERATE_NFT", "ISSUE_NFT"],

    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        const packageId = runtime.getSetting("NFT_PACKAGE_ID");
        const module = runtime.getSetting("NFT_MODULE");
        return !!(packageId && module);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            console.log("[SUI] Starting NFT mint...");
            const walletInfo = await walletProvider.get(runtime, message, state);
            state.walletInfo = walletInfo;

            // 直接构造context字符串
            const context = mintTemplate.replace(
                "{{text}}", 
                message.content.text || ""
            );

            console.log("[SUI] Generated context:", context);

            const content = await generateObject({
                runtime,
                context,
                schema: mintSchema,
                modelClass: ModelClass.SMALL,
            });

            console.log("[SUI] Extracted content:", content);

            console.log("Generated content:", content);
            const mintContent = content.object as SwapPayload;
            console.log("Mint content:", mintContent);

            // 验证必要参数
            if (!mintContent.name || !mintContent.description || !mintContent.url) {
                throw new Error(
                    "Missing required parameters: name, description, or url"
                );
            }

            // let content;
            // try {
            //     if (typeof message.content === 'string') {
            //         console.log("[SUI] message.content:", message.content);
            //         // 尝试从字符串中提取JSON
            //         const match = message.content.match(/\{[\s\S]*\}/);
            //         console.log("[SUI] match:", match);
            //         if (match) {
            //             content = JSON.parse(match[0]);
            //         }
            //     } else if (typeof message.content === 'object') {
            //         // 如果已经是对象，直接使用
            //         content = message.content;
            //     }

            //     console.log("[SUI] before mintSchema.parse(content):",  message.content,content);

            //     // 验证内容格式
            //     content = mintSchema.parse(content);
            // } catch (parseError) {
            //     console.error("[SUI] Failed to parse content:", parseError);
            //     throw new Error("Invalid NFT parameters format. Please provide name, description and url in JSON format.");
            // }

            // 获取合约配置
            const packageId = runtime.getSetting("NFT_PACKAGE_ID");
            const module = runtime.getSetting("NFT_MODULE");

            const suiAccount = parseAccount(runtime);
            const network = runtime.getSetting("SUI_NETWORK");
            const suiClient = new SuiClient({
                url: getFullnodeUrl(network as SuiNetwork),
            });
            console.log("network", network);

            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::${module}::mint_to_sender`,
                arguments: [tx.pure.string(mintContent.name), tx.pure.string(mintContent.description), tx.pure.string(mintContent.url)],
            });

            const result = await suiClient.signAndExecuteTransaction({
                signer: suiAccount,
                transaction: tx,
            });

            console.log("NFT minted successfully:", result.digest);

            if (callback) {
                callback({
                    text: "Successfully minted NFT",
                    content: result,
                });
            }
            return true;

        } catch (error) {
            console.error("[SUI] Mint error:", error);
            if (callback) {
                callback({
                    text: `Failed to mint NFT: ${(error as Error).message}`,
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
                    text: "创建nft name为: 睡觉, content为：歌声悠扬绕梁间，心灵共鸣乐无边。旋律如流水潺潺，温暖心扉入梦田, url为：ipfs://QmXXX...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll mint your poem as an NFT on Sui blockchain.",
                    action: "mint",
                },
            },
        ],
    ],
};

export default mintNFT;
