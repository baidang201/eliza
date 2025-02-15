import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Heart, ShoppingCart } from "lucide-react";

interface NFTItem {
  name: string;
  imageUrl: string;
  hash: string;
  description?: string;
  url?: string;
}

interface NFTDetail {
  description: string;
  url: string;
}

interface NFTActions {
  liked: boolean;
  wantToBuy: boolean;
}

function isAudioUrl(url: string): boolean {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  return audioExtensions.some(ext => url.toLowerCase().endsWith(ext));
}

function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      <span className="text-xs text-gray-500">
        {isPlaying ? "playing" : "click play"}
      </span>
    </div>
  );
}

function NFTActionButtons({ 
  hash, 
  actions, 
  onToggleLike, 
  onToggleWantToBuy 
}: { 
  hash: string;
  actions: NFTActions;
  onToggleLike: (hash: string) => void;
  onToggleWantToBuy: (hash: string) => void;
}) {
  return (
    <div className="flex gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center gap-1 ${actions.liked ? 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20' : ''}`}
        onClick={() => onToggleLike(hash)}
      >
        <Heart className={`h-4 w-4 ${actions.liked ? 'fill-current' : ''}`} />
        <span>like</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center gap-1 ${actions.wantToBuy ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : ''}`}
        onClick={() => onToggleWantToBuy(hash)}
      >
        <ShoppingCart className="h-4 w-4" />
        <span>want</span>
      </Button>
    </div>
  );
}

const SUI_RPC_URL = 'https://fullnode.devnet.sui.io/';
const NFT_TYPE = '0x6126089757126db006817b68866ed81c82404c95b26e96eccb2fa9fca6331abe::testnet_nft::TestnetNFT';
const OWNER_ADDRESS = '0x68d80590ac93e4f2cc4bcc37d4cd9292b050c306b5e41d7e1c167115937dc6fb'; // NFT拥有者地址

async function fetchFromSui(method: string, params: any[]): Promise<any> {
  const response = await fetch(SUI_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Unknown error');
  }

  return data.result;
}

export default function NFTsRoute() {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nftActions, setNftActions] = useState<Record<string, NFTActions>>({});

  const fetchNFTDetail = async (hash: string): Promise<NFTDetail> => {
    const data = await fetchFromSui('sui_getObject', [
      hash,
      {
        showType: true,
        showOwner: true,
        showContent: true,
      }
    ]);

    const fields = data.data.content.fields;
    return {
      description: fields.description,
      url: fields.url
    };
  };

  const handleToggleLike = (hash: string) => {
    setNftActions(prev => ({
      ...prev,
      [hash]: {
        ...prev[hash] || { liked: false, wantToBuy: false },
        liked: !prev[hash]?.liked
      }
    }));
  };

  const handleToggleWantToBuy = (hash: string) => {
    setNftActions(prev => ({
      ...prev,
      [hash]: {
        ...prev[hash] || { liked: false, wantToBuy: false },
        wantToBuy: !prev[hash]?.wantToBuy
      }
    }));
  };

  useEffect(() => {
    const fetchNFTs = async () => {
      setLoading(true);
      try {
        // 使用正确的RPC方法名
        const data = await fetchFromSui('suix_getOwnedObjects', [
          OWNER_ADDRESS,
          {
            filter: {
              StructType: NFT_TYPE
            },
            options: {
              showType: true,
              showContent: true,
              showDisplay: true,
            }
          }
        ]);

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid response format');
        }

        interface NFTData {
          data: {
            objectId: string;
            content: {
              fields: {
                name?: string;
                url?: string;
              };
            };
          };
        }

        const nftList = data.data
          .filter((item: NFTData)  => item.data && item.data.content)
          .map((item: NFTData)  => ({
            hash: item.data.objectId,
            name: item.data.content.fields.name || 'Unnamed NFT',
            imageUrl: item.data.content.fields.url || '',
          }));

        // Initialize actions for each NFT
        const initialActions: Record<string, NFTActions> = {};
        nftList.forEach((item: NFTItem) => {
          initialActions[item.hash] = { liked: false, wantToBuy: false };
        });
        setNftActions(initialActions);

        const nftsWithDetails = await Promise.all(
          nftList.map(async (item: NFTItem) => {
            try {
              const details = await fetchNFTDetail(item.hash);
              return {
                ...item,
                description: details.description,
                url: details.url
              };
            } catch (error) {
              console.error(`获取NFT详情失败 (${item.hash}):`, error);
              return item;
            }
          })
        );

        setNfts(nftsWithDetails);
      } catch (error) {
        console.error('获取NFT列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-100" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {nfts.map((item) => (
        <Card key={item.hash} className="overflow-hidden">
          {/* <CardHeader className="p-0">
            <img 
              alt={item.name} 
              src={item.imageUrl}
              className="w-full h-48 object-cover"
            />
          </CardHeader> */}
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-gray-400 mb-2 line-clamp-3">
                {item.description}
              </p>
            )}
            {item.url && (
              <>
                <p className="text-xs text-gray-500 truncate">
                  {item.url}
                </p>
                {isAudioUrl(item.url) && (
                  <AudioPlayer url={item.url} />
                )}
              </>
            )}
            <NFTActionButtons
              hash={item.hash}
              actions={nftActions[item.hash] || { liked: false, wantToBuy: false }}
              onToggleLike={handleToggleLike}
              onToggleWantToBuy={handleToggleWantToBuy}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 