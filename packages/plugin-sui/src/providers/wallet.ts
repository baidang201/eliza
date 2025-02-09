import {
    elizaLogger,
    IAgentRuntime,
    ICacheManager,
    Memory,
    Provider,
    State,
} from "@elizaos/core";

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

import { MIST_PER_SUI } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import NodeCache from "node-cache";
import * as path from "path";
import { parseAccount, SuiNetwork } from "../utils";
import axios from "axios";
// Provider configuration
const PROVIDER_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
};

interface WalletPortfolio {
    totalUsd: string;
    totalSui: string;
}

interface Prices {
    sui: { usd: string };
}

const cacheTimeSeconds = 30;

export class WalletProvider {
    private cache: NodeCache;
    private cacheKey: string = "sui/wallet";

    constructor(
        private suiClient: SuiClient,
        private address: string,
        private cacheManager: ICacheManager
    ) {
        this.cache = new NodeCache({ stdTTL: cacheTimeSeconds }); // Cache TTL set to 5 minutes
    }

    private async readFromCache<T>(key: string): Promise<T | null> {
        const cached = await this.cacheManager.get<T>(
            path.join(this.cacheKey, key)
        );
        return cached;
    }

    private async writeToCache<T>(key: string, data: T): Promise<void> {
        await this.cacheManager.set(path.join(this.cacheKey, key), data, {
            expires: Date.now() + cacheTimeSeconds * 1000,
        });
    }

    private async getCachedData<T>(key: string): Promise<T | null> {
        // Check in-memory cache first
        const cachedData = this.cache.get<T>(key);
        if (cachedData) {
            return cachedData;
        }

        // Check file-based cache
        const fileCachedData = await this.readFromCache<T>(key);
        if (fileCachedData) {
            // Populate in-memory cache
            this.cache.set(key, fileCachedData);
            return fileCachedData;
        }

        return null;
    }

    private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
        // Set in-memory cache
        this.cache.set(cacheKey, data);

        // Write to file-based cache
        await this.writeToCache(cacheKey, data);
    }

    private async fetchPricesWithRetry() {
        let lastError: Error;

        for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
            try {
                const cetusSuiUsdcPoolAddr =
                    "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab";
                const url = `https://api.dexscreener.com/latest/dex/pairs/sui/${cetusSuiUsdcPoolAddr}`;
                elizaLogger.info(`Fetching SUI price from ${url}`);
                //const response = await axios.get(url);
                //return response.data;
                return  JSON.parse( '{"schemaVersion":"1.0.0","pairs":[{"chainId":"sui","dexId":"cetus","url":"https://dexscreener.com/sui/0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab","pairAddress":"0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab","baseToken":{"address":"0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC","name":"USDC","symbol":"USDC"},"quoteToken":{"address":"0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI","name":"SUI Token","symbol":"SUI"},"priceNative":"0.2967","priceUsd":"1.0015","txns":{"m5":{"buys":41,"sells":30},"h1":{"buys":816,"sells":655},"h6":{"buys":4420,"sells":4153},"h24":{"buys":17191,"sells":17196}},"volume":{"h24":7697615.6,"h6":1939905,"h1":299121.4,"m5":15300.15},"priceChange":{"m5":0.25,"h1":0.06,"h6":0.13,"h24":0.17},"liquidity":{"usd":1039196.25,"base":245837,"quote":234941},"fdv":2360759,"marketCap":55401650783,"pairCreatedAt":1728468437000}],"pair":{"chainId":"sui","dexId":"cetus","url":"https://dexscreener.com/sui/0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab","pairAddress":"0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab","baseToken":{"address":"0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC","name":"USDC","symbol":"USDC"},"quoteToken":{"address":"0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI","name":"SUI Token","symbol":"SUI"},"priceNative":"0.2967","priceUsd":"1.0015","txns":{"m5":{"buys":41,"sells":30},"h1":{"buys":816,"sells":655},"h6":{"buys":4420,"sells":4153},"h24":{"buys":17191,"sells":17196}},"volume":{"h24":7697615.6,"h6":1939905,"h1":299121.4,"m5":15300.15},"priceChange":{"m5":0.25,"h1":0.06,"h6":0.13,"h24":0.17},"liquidity":{"usd":1039196.25,"base":245837,"quote":234941},"fdv":2360759,"marketCap":55401650783,"pairCreatedAt":1728468437000}}')
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
                    const delay = PROVIDER_CONFIG.RETRY_DELAY * Math.pow(2, i);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        console.error(
            "All attempts failed. Throwing the last error:",
            lastError
        );
        throw lastError;
    }

    async fetchPortfolioValue(): Promise<WalletPortfolio> {
        try {
            const cacheKey = `portfolio-${this.address}`;
            const cachedValue =
                await this.getCachedData<WalletPortfolio>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPortfolioValue", cachedValue);
                return cachedValue;
            }
            console.log("Cache miss for fetchPortfolioValue");

            const prices = await this.fetchPrices().catch((error) => {
                console.error("Error fetching SUI price:", error);
                throw error;
            });
            const suiAmountOnChain = await this.suiClient
                .getBalance({
                    owner: this.address,
                })
                .catch((error) => {
                    console.error("Error fetching SUI amount:", error);
                    throw error;
                });

            const suiAmount =
                Number.parseInt(suiAmountOnChain.totalBalance) /
                Number(MIST_PER_SUI);
            const totalUsd = new BigNumber(suiAmount).times(prices.sui.usd);

            const portfolio = {
                totalUsd: totalUsd.toString(),
                totalSui: suiAmount.toString(),
            };
            this.setCachedData(cacheKey, portfolio);
            console.log("Fetched portfolio:", portfolio);
            return portfolio;
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
    }

    async fetchPrices(): Promise<Prices> {
        try {
            const cacheKey = "prices";
            const cachedValue = await this.getCachedData<Prices>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPrices");
                return cachedValue;
            }
            console.log("Cache miss for fetchPrices");

            const suiPriceData = await this.fetchPricesWithRetry().catch(
                (error) => {
                    console.error("Error fetching SUI price:", error);
                    throw error;
                }
            );
            const prices: Prices = {
                sui: { usd: (1 / suiPriceData.pair.priceNative).toString() },
            };
            this.setCachedData(cacheKey, prices);
            return prices;
        } catch (error) {
            console.error("Error fetching prices:", error);
            throw error;
        }
    }

    formatPortfolio(runtime, portfolio: WalletPortfolio): string {
        let output = `${runtime.character.name}\n`;
        output += `Wallet Address: ${this.address}\n`;

        const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
        const totalSuiFormatted = new BigNumber(portfolio.totalSui).toFixed(4);

        output += `Total Value: $${totalUsdFormatted} (${totalSuiFormatted} SUI)\n`;

        return output;
    }

    async getFormattedPortfolio(runtime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue();
            return this.formatPortfolio(runtime, portfolio);
        } catch (error) {
            console.error("Error generating portfolio report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        const suiAccount = parseAccount(runtime);

        try {
            const suiClient = new SuiClient({
                url: getFullnodeUrl(
                    runtime.getSetting("SUI_NETWORK") as SuiNetwork
                ),
            });
            const provider = new WalletProvider(
                suiClient,
                suiAccount.toSuiAddress(),
                runtime.cacheManager
            );
            return await provider.getFormattedPortfolio(runtime);
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};

// Module exports
export { walletProvider };
