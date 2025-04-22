"use client";

// React and UI Components
import React, { useEffect, useState, useCallback } from "react";
import LinksGrid from "@/components/Links";
import Header from "@/components/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ERC20info from "@/components/ERC20Info";
import TxNotification from "@/components/TxNotification";

// Particle Network Imports
import {
  ConnectButton,
  useAccount,
  usePublicClient,
  useParticleAuth,
  useSmartAccount,
} from "@particle-network/connectkit";
import { AAWrapProvider, SendTransactionMode } from "@particle-network/aa";

// Blockchain Utilities
import { ethers, type Eip1193Provider } from "ethers";
import { formatEther, parseEther, formatUnits, encodeFunctionData } from "viem";
import useErc20Abi from "@/utils/Erc20Abi";
import { formatBalance, truncateAddress, copyToClipboard } from "@/utils/utils";

// Constants
const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const; //USDC on Base Sepolia
const USDC_DECIMALS = 6;

export default function Home() {
  const { isConnected, chainId, chain } = useAccount();
  const { getUserInfo } = useParticleAuth();
  const publicClient = usePublicClient();
  const smartAccount = useSmartAccount();

  // State Management
  const [userAddress, setUserAddress] = useState<string>("");
  const [userInfo, setUserInfo] = useState<Record<string, any> | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [erc20balance, setErc20Balance] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Initialize Ethers provider with Account Abstraction and gasless transactions
  const customProvider = smartAccount
    ? new ethers.BrowserProvider(
        new AAWrapProvider(
          smartAccount,
          SendTransactionMode.Gasless
        ) as Eip1193Provider,
        "any"
      )
    : null;

  const erc20Abi = useErc20Abi();

  /**
   * Tutorial: Reading ERC20 Token Balance
   * This function demonstrates how to read data from a smart contract using
   * Particle Network's publicClient. It fetches the USDC balance on Sepolia testnet.
   *
   * @param {string} address - The address to fetch the balance for
   */
  const fetchBalanceErc20 = useCallback(
    async (address: string) => {
      if (!publicClient || !address) {
        toast.error("Missing client or address");
        return;
      }

      try {
        const rawBalance = await publicClient.readContract({
          address: USDC_CONTRACT,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });

        if (typeof rawBalance === "bigint") {
          setErc20Balance(formatUnits(rawBalance, USDC_DECIMALS));
        } else {
          setErc20Balance("0.0");
          toast.warn("Invalid USDC balance");
        }
      } catch {
        toast.error("Failed to fetch USDC balance");
        setErc20Balance("0.0");
      }
    },
    [publicClient, erc20Abi]
  );

  /**
   * Tutorial: Transferring ERC20 Tokens
   * This function demonstrates how to transfer ERC20 tokens to another address
   * using Account Abstraction for gasless transactions.
   *
   * @param recipient - The address to receive the tokens
   * @param value - The amount of tokens to transfer
   */
  const transferErc20 = async (recipient: `0x${string}`, value: bigint) => {
    try {
      // Prepare the transaction data using viem's encodeFunctionData
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, value],
      });

      // Simulate the transaction to check for potential errors
      await publicClient?.simulateContract({
        address: USDC_CONTRACT,
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, value],
        account: userAddress as `0x${string}`,
      });

      if (!customProvider) {
        throw new Error("Provider not initialized");
      }

      // Get signer and send the transaction
      const signer = await customProvider.getSigner();
      const tx = await signer.sendTransaction({
        to: USDC_CONTRACT,
        data,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      setTransactionHash(tx.hash);

      return receipt;
    } catch (error) {
      console.error("Error in transferErc20:", error);
      throw error;
    }
  };

  /**
   * Fetches the balance of a given address.
   * @param {string} address - The address to fetch the balance for.
   */
  const fetchBalance = useCallback(
    async (address: string) => {
      try {
        const balanceResponse = await publicClient?.getBalance({
          address: address as `0x${string}`,
        });

        if (balanceResponse) {
          const balanceInEther = formatEther(balanceResponse);
          setBalance(formatBalance(balanceInEther));
        } else {
          console.error("Balance response is undefined");
          setBalance("0.0");
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    },
    [publicClient, setBalance]
  );

  /**
   * Loads the user's account data such as address, balance, and user info.
   */
  const loadAccountData = useCallback(async () => {
    try {
      if (isConnected && smartAccount) {
        const address = await smartAccount.getAddress();
        setUserAddress(address);
        fetchBalance(address);
        fetchBalanceErc20(address);
      }

      if (isConnected) {
        const info = getUserInfo();
        setUserInfo(info);
      }
    } catch (error) {
      console.error("Error loading account data:", error);
    }
  }, [isConnected, smartAccount, getUserInfo, fetchBalance, fetchBalanceErc20]);

  useEffect(() => {
    loadAccountData();
  }, [
    isConnected,
    smartAccount,
    getUserInfo,
    chainId,
    fetchBalance,
    fetchBalanceErc20,
    loadAccountData,
  ]);

  /**
   * Sends a transaction using the native AA Particle provider with gasless mode.
   */
  const executeTxNative = async () => {
    setIsSending(true);
    try {
      const tx = {
        to: recipientAddress,
        value: parseEther("0.00000001").toString(),
        data: "0x",
      };

      // Fetch feequotes and use verifyingPaymasterGasless for a gasless transaction
      const feeQuotesResult = await smartAccount?.getFeeQuotes(tx);
      const { userOp, userOpHash } =
        feeQuotesResult?.verifyingPaymasterGasless || {};
      console.log(JSON.stringify(feeQuotesResult, null, 2));
      if (userOp && userOpHash) {
        const txHash =
          (await smartAccount?.sendUserOperation({
            userOp,
            userOpHash,
          })) || null;

        setTransactionHash(txHash);
        // console.log("Transaction sent:", txHash);
      } else {
        console.error("User operation is undefined");
      }
    } catch (error) {
      console.error("Failed to send transaction:", error);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Sends a transaction using the ethers.js library.
   * This transaction is gasless since the customProvider is initialized as gasless
   */
  const executeTxEthers = async () => {
    if (!customProvider) return;

    const signer = await customProvider.getSigner();
    setIsSending(true);
    try {
      const tx = {
        to: recipientAddress,
        value: parseEther("0.01").toString(),
      };

      const txResponse = await signer.sendTransaction(tx);
      const txReceipt = await txResponse.wait();

      setTransactionHash(txReceipt?.hash || null);
    } catch (error) {
      console.error("Failed to send transaction using ethers.js:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="container min-h-screen mx-auto px-4 py-8">
        <Header />
        <div className="w-full flex justify-center mt-4 mb-8">
          <ConnectButton label="Click to login" />
        </div>

        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Account Info Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <span className="text-purple-300">Network</span>
                <span>{chain?.name || "Unknown"}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <span className="text-purple-300">Address</span>
                <div className="flex items-center gap-2">
                  <span>{truncateAddress(userAddress)}</span>
                  <button
                    onClick={() => copyToClipboard(userAddress)}
                    className="text-purple-300 hover:text-purple-400 transition-colors"
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <span className="text-purple-300">Native Balance</span>
                <span className="flex items-center gap-2">
                  {balance
                    ? `${formatBalance(balance)} ${
                        chain?.nativeCurrency.symbol
                      }`
                    : "Loading..."}
                  <button
                    onClick={() => fetchBalance(userAddress)}
                    className="text-purple-300 hover:text-purple-400 transition-colors"
                    title="Refresh balance"
                  >
                    🔁
                  </button>
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <span className="text-purple-300">USDC Balance</span>
                <span className="flex items-center gap-2">
                  {erc20balance ? `${erc20balance} USDC` : "Loading..."}
                  <button
                    onClick={() => fetchBalanceErc20(userAddress)}
                    className="text-purple-300 hover:text-purple-400 transition-colors"
                    title="Refresh USDC balance"
                  >
                    🔁
                  </button>
                </span>
              </div>
              <div className="mt-8">
                <LinksGrid />
              </div>
            </div>

            {/* Gasless Transactions Section */}
            <div className="border border-purple-500 p-6 rounded-lg bg-gray-800 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-purple-300">
                Gasless Transactions Demo
              </h2>

              <div className="bg-purple-900/20 p-4 rounded-lg mb-6">
                <p className="text-sm text-purple-300">
                  This demo shows how to send transactions without paying gas
                  fees using Particle Network&apos;s Account Abstraction.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full p-3 rounded-lg border border-purple-500/30 bg-gray-900 text-white
                      focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
                      placeholder-gray-500 transition-all duration-200"
                  />
                </div>

                <button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={executeTxNative}
                  disabled={!recipientAddress || isSending}
                  title="Send native tokens using Particle's provider"
                >
                  {isSending ? (
                    <>
                      <span>Sending...</span>
                      <span className="animate-spin">⚡</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Send 0.01 {chain?.nativeCurrency.symbol} (Particle AA
                        Provider)
                      </span>
                      <span>⚡</span>
                    </>
                  )}
                </button>

                <button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={executeTxEthers}
                  disabled={!recipientAddress || isSending}
                >
                  {isSending
                    ? "Sending..."
                    : `Send 0.01 ${chain?.nativeCurrency.symbol} (Ethers)`}
                </button>

                <button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!recipientAddress || isSending}
                  onClick={async () => {
                    try {
                      toast.info("Sending USDC...");
                      await transferErc20(
                        recipientAddress as `0x${string}`,
                        BigInt(1_000_000)
                      );
                      toast.success("Successfully sent 1 USDC!");
                    } catch (error) {
                      toast.error("Failed to send USDC");
                    }
                  }}
                  title="Send 1 USDC to the specified address"
                >
                  {isSending ? "Sending..." : "Send 1 USDC"}
                </button>
              </div>

              {transactionHash && (
                <TxNotification
                  hash={transactionHash}
                  blockExplorerUrl={chain?.blockExplorers?.default.url || ""}
                />
              )}
            </div>
          </div>
        )}
        <div className="mt-8 max-w-6xl mx-auto"></div>
        <ToastContainer />
      </div>
    </>
  );
}
