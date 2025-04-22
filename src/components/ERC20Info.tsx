import { useState, useEffect, useCallback, memo } from "react";
import { formatUnits } from "viem";
import useErc20Abi from "@/utils/Erc20Abi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePublicClient } from "@particle-network/connectkit";
import Image from "next/image";

interface ERC20InfoProps {
  tokenAddress: string;
  walletAddress: string;
}

const ERC20Info = memo(({ tokenAddress, walletAddress }: ERC20InfoProps) => {
  const erc20Abi = useErc20Abi();
  const [balance, setBalance] = useState<string>("-");
  const [tokenName, setTokenName] = useState<string>("Loading...");
  const [tokenSymbol, setTokenSymbol] = useState<string>("...");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const tokenIcon = "/usdc.png"; // Static USDC icon

  const publicClient = usePublicClient();
  // Memoize the fetchTokenData function to prevent recreation on each render
  const fetchTokenData = useCallback(async () => {
    // Check if addresses and client are valid before proceeding
    if (
      !tokenAddress ||
      !walletAddress ||
      !publicClient ||
      !tokenAddress.startsWith("0x") ||
      tokenAddress.length !== 42 ||
      !walletAddress.startsWith("0x") ||
      walletAddress.length !== 42
    ) {
      console.log("Waiting for valid addresses and client...");
      return;
    }

    try {
      // Use Promise.all to fetch data in parallel
      const [decimals, erc20Balance, name, symbol] = await Promise.all([
        // Fetch token decimals
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        // Fetch token balance
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        }),
        // Fetch token name
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "name",
        }),
        // Fetch token symbol
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "symbol",
        }),
      ]);

      // Batch state updates to trigger a single re-render
      if (typeof erc20Balance === "bigint" && typeof decimals === "number") {
        setBalance(formatUnits(erc20Balance, decimals));
      } else {
        setBalance("0.0");
      }

      setTokenName(name?.toString() || "Unknown Token");
      setTokenSymbol(symbol?.toString() || "?");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching token data:", error);
      setBalance("Error");
      setTokenName("Error");
      setTokenSymbol("?");
    }
  }, [publicClient, erc20Abi, tokenAddress, walletAddress]);

  // Use useEffect with the memoized function
  useEffect(() => {
    fetchTokenData();

    // Optional: Set up an interval to refresh data periodically
    // const intervalId = setInterval(fetchTokenData, 30000); // Refresh every 30 seconds
    // return () => clearInterval(intervalId); // Clean up on unmount
  }, [fetchTokenData]);

  return (
    <Card className="max-w-xs mx-auto p-4 shadow-md rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
      <CardHeader className="flex flex-col items-center space-y-2 pb-3 px-2">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-blue-500 rounded-full opacity-75 blur-sm"></div>
          <Image
            src={tokenIcon}
            alt="Token Icon"
            width={48}
            height={48}
            className="relative rounded-full border-2 border-white shadow-md"
          />
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          {tokenName}{" "}
          <span className="text-sm font-medium text-blue-500">
            ({tokenSymbol})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1 px-2">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 shadow-inner">
          <div className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-0.5">
            Your Balance
          </div>
          <div className="text-2xl font-bold text-gray-800 flex items-center justify-center">
            <span className="mr-1">{balance}</span>
            <span className="text-sm text-blue-500 font-semibold">
              {tokenSymbol}
            </span>
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
          </div>
          <div>Last updated: {lastUpdated}</div>
        </div>
      </CardContent>
    </Card>
  );
});

// Add display name for ESLint
ERC20Info.displayName = "ERC20Info";

export default ERC20Info;
