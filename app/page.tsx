"use client";
import React, { useEffect, useState } from "react";
import LinksGrid from "@/components/Links";
import Header from "@/components/Header";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Utilities
import { formatBalance, truncateAddress, copyToClipboard } from "@/utils/utils";
import TxNotification from "@/components/TxNotification";

// Particle imports
import {
  ConnectButton,
  useAccount,
  usePublicClient,
  useParticleAuth,
  useSmartAccount,
} from "@particle-network/connectkit";

// Eip1193 and AA Provider
import { AAWrapProvider, SendTransactionMode } from "@particle-network/aa"; // Only needed with Eip1193 provider
import { ethers, type Eip1193Provider } from "ethers";
import { formatEther, parseEther, formatUnits, encodeFunctionData } from "viem";

export default function Home() {
  const { isConnected, chainId, isConnecting, isDisconnected, chain } =
    useAccount();
  const { getUserInfo } = useParticleAuth();
  const publicClient = usePublicClient();
  const smartAccount = useSmartAccount();

  const [userAddress, setUserAddress] = useState<string>("");
  const [userInfo, setUserInfo] = useState<Record<string, any> | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [erc20balance, setErc20Balance] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Connection status message based on the account's connection state
  const connectionStatus = isConnecting
    ? "Connecting..."
    : isConnected
    ? "Connected"
    : isDisconnected
    ? "Disconnected"
    : "Unknown";

  // Init custom provider with gasless transaction mode
  const customProvider = smartAccount
    ? new ethers.BrowserProvider(
        new AAWrapProvider(
          smartAccount,
          SendTransactionMode.Gasless
        ) as Eip1193Provider,
        "any"
      )
    : null;

  // ERC20 ABI (only approve and transfer)
  const erc20Abi = [
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { internalType: "address", name: "spender", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
    },
    {
      name: "transfer",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
    },
    {
      name: "transferFrom",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { internalType: "address", name: "sender", type: "address" },
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
    },
  ];

  /**
   * Fetches the ERC20 USDC Sepolia balance of a given address. Showcase how to read from a smart contract using publicClient.
   * @param {string} address - The address to fetch the balance for.
   */
  const fetchBalanceErc20 = async (address: string) => {
    try {
      const erc20Balance = await publicClient?.readContract({
        address: "0xda9d4f9b69ac6C22e444eD9aF0CfC043b7a7f53f" as `0x${string}`, // Contract address for USDC on Sepolia
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`], // Wallet address
      });
      console.log(erc20Balance);
      if (typeof erc20Balance === "bigint") {
        // Format the balance
        const balanceInEther = formatUnits(erc20Balance, 6);
        setErc20Balance(balanceInEther.toString());
      } else {
        console.error(
          "Invalid response type for balance:",
          typeof erc20Balance
        );
        setErc20Balance("0.0");
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  /**
   * Approves a spender to spend a specified amount of ERC-20 tokens on behalf of the caller.
   * This function simulates the transaction, prepares the necessary data, and sends a gasless transaction.
   *
   * @param {`0x${string}`} spender - The address of the spender to approve.
   * @param {bigint} value - The amount of tokens to approve for spending.
   * @returns {Promise<void>} - Resolves when the transaction is successfully sent, otherwise throws an error.
   */
  const approveErc20 = async (spender: `0x${string}`, value: bigint) => {
    try {
      // Encode function data for the transaction
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, value],
      });

      // Create the transaction object
      // This tx calls the approve function using the encoded arguments
      const tx = {
        to: "0xda9d4f9b69ac6C22e444eD9aF0CfC043b7a7f53f" as `0x${string}`,
        value: "0x0",
        data,
      };

      // Fetch fee quotes and gasless transaction configuration
      const feeQuotesResult = await smartAccount?.getFeeQuotes(tx);
      const { userOp, userOpHash } =
        feeQuotesResult?.verifyingPaymasterGasless || {};

      if (userOp && userOpHash) {
        // Send the User Operation transaction
        const txHash =
          (await smartAccount?.sendUserOperation({
            userOp,
            userOpHash,
          })) || null;

        // Update the state with transaction hash
        setTransactionHash(txHash);
        console.log("Transaction sent:", txHash);
      } else {
        alert("Failed to generate user operation. Please try again.");
      }
    } catch (error) {
      // Show alert and log error if simulation fails
      alert(
        "Error: Failed to simulate the contract interaction. Please check the spender address or value and try again."
      );
      console.error("Error simulating contract call:", error);
      throw error;
    }
  };

  /**
   * Transfers ERC20 tokens to a specified recipient.
   * This function simulates the transaction, prepares the necessary data, and sends a gasless transaction.
   *
   * @param {`0x${string}`} recipient - The address of the recipient to send tokens to.
   * @param {bigint} value - The amount of tokens to send.
   * @returns {Promise<void>} - Resolves when the transaction is successfully sent, otherwise throws an error.
   */
  const transferErc20 = async (recipient: `0x${string}`, value: bigint) => {
    try {
      // Encode function data for the transaction
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, value],
      });

      // Create the transaction object
      const tx = {
        to: "0xda9d4f9b69ac6C22e444eD9aF0CfC043b7a7f53f" as `0x${string}`,
        value: "0x0",
        data,
      };

      // Fetch fee quotes and gasless transaction configuration
      const feeQuotesResult = await smartAccount?.getFeeQuotes(tx);
      const { userOp, userOpHash } =
        feeQuotesResult?.verifyingPaymasterGasless || {};

      if (userOp && userOpHash) {
        // Send the User Operation transaction
        const txHash =
          (await smartAccount?.sendUserOperation({
            userOp,
            userOpHash,
          })) || null;

        // Update the state with transaction hash
        setTransactionHash(txHash);
        console.log("Transaction sent:", txHash);
      } else {
        alert("Failed to generate user operation. Please try again.");
      }
    } catch (error) {
      // Show alert and log error if simulation fails
      alert(
        "Error: Failed to simulate the contract interaction. Please check the recipient address or value and try again."
      );
      console.error("Error simulating contract call:", error);
      throw error;
    }
  };

  /**
   * Fetches the balance of a given address.
   * @param {string} address - The address to fetch the balance for.
   */
  const fetchBalance = async (address: string) => {
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
  };

  /**
   * Loads the user's account data such as address, balance, and user info.
   */
  useEffect(() => {
    const loadAccountData = async () => {
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
    };

    loadAccountData();
  }, [isConnected, smartAccount, getUserInfo, chainId]);

  /**
   * Handles the on-ramp process by opening the Particle Network Ramp in a new window.
   */
  const handleOnRamp = () => {
    const onRampUrl = `https://ramp.particle.network/?fiatCoin=USD&cryptoCoin=ETH&network=Ethereum&theme=dark&language=en`;
    window.open(onRampUrl, "_blank");
  };

  /**
   * Sends a transaction using the native AA Particle provider with gasless mode.
   */
  const executeTxNative = async () => {
    setIsSending(true);
    try {
      const tx = {
        to: recipientAddress,
        value: parseEther("0.01").toString(),
        data: "0x",
      };

      // Fetch feequotes and use verifyingPaymasterGasless for a gasless transaction
      const feeQuotesResult = await smartAccount?.getFeeQuotes(tx);
      const { userOp, userOpHash } =
        feeQuotesResult?.verifyingPaymasterGasless || {};

      if (userOp && userOpHash) {
        const txHash =
          (await smartAccount?.sendUserOperation({
            userOp,
            userOpHash,
          })) || null;

        setTransactionHash(txHash);
        console.log("Transaction sent:", txHash);
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
    <div className="container min-h-screen flex flex-col justify-center items-center mx-auto gap-4 px-4 md:px-8">
      <Header />
      <div className="w-full flex justify-center mt-4">
        <ConnectButton label="Click to login" />
      </div>
      <div className="w-full text-center mb-4 px-4"></div>
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-full sm:w-3/4 md:w-1/2 mb-4">
        <h2 className="text-md font-semibold text-white text-center">
          Status: {connectionStatus}
        </h2>
      </div>
      {isConnected ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
            <div className="border border-purple-500 p-6 rounded-lg w-full">
              {userInfo && (
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-white mr-2">
                    Name: {userInfo.name || "Loading..."}
                  </h2>
                  {userInfo.avatar && (
                    <img
                      src={userInfo.avatar}
                      alt="User Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                </div>
              )}
              <h2 className="text-lg font-semibold mb-2 text-white flex items-center">
                Address:{" "}
                <code>{truncateAddress(userAddress) || "Loading..."}</code>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 ml-2 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center"
                  onClick={() => copyToClipboard(userAddress)}
                >
                  📋
                </button>
              </h2>

              <h2 className="text-lg font-semibold mb-2 text-white">
                Chain: <code>{chain?.name || "Loading..."}</code>
              </h2>
              <h2 className="text-lg font-semibold mb-2 text-white flex items-center">
                Balance: {balance || "Loading..."}
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 ml-2 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center"
                  onClick={() => fetchBalance(userAddress)}
                >
                  🔄
                </button>
              </h2>
              <h2 className="text-lg font-semibold mb-2 text-white flex items-center">
                Sepolia USDC balance: {erc20balance || "Loading..."}
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 ml-2 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center"
                  onClick={() => fetchBalance(userAddress)}
                >
                  🔄
                </button>
              </h2>
              <button
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                onClick={handleOnRamp}
              >
                Buy Crypto with Fiat
              </button>
            </div>
            <div className="border border-purple-500 p-6 rounded-lg w-full mt-4 md:mt-0">
              <h2 className="text-2xl font-bold mb-2 text-white">
                Send a gasless transaction
              </h2>
              <h2 className="text-lg">
                Send 0.01 {chain?.nativeCurrency.symbol}
              </h2>
              <input
                type="text"
                placeholder="Recipient Address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="mt-4 p-3 w-full rounded border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div className="flex flex-col gap-4 mt-4">
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  onClick={executeTxNative}
                  disabled={!recipientAddress || isSending}
                >
                  {isSending
                    ? "Sending..."
                    : `Send 0.01 ${chain?.nativeCurrency.symbol} Particle provider`}
                </button>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  onClick={executeTxEthers}
                  disabled={!recipientAddress || isSending}
                >
                  {isSending
                    ? "Sending..."
                    : `Send 0.01 ${chain?.nativeCurrency.symbol} ethers`}
                </button>
                <button
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  disabled={!recipientAddress || isSending}
                  onClick={async () => {
                    try {
                      const result = await approveErc20(
                        userAddress as `0x${string}`,
                        BigInt("5000000") // This is USDC so only 6 decimals
                      );
                      console.log("Simulation result:", result);
                    } catch (error) {
                      console.error(
                        "Error simulating approve transaction:",
                        error
                      );
                    }
                  }}
                >
                  Approve USDC ERC20
                </button>
                <button
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  disabled={!recipientAddress || isSending}
                  onClick={async () => {
                    try {
                      const result = await transferErc20(
                        recipientAddress as `0x${string}`,
                        BigInt("1000000") // This is USDC so only 6 decimals
                      );
                      console.log("Simulation result:", result);
                    } catch (error) {
                      console.error(
                        "Error simulating approve transaction:",
                        error
                      );
                    }
                  }}
                >
                  Send 1 USDC ERC20
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
          <LinksGrid />
          <ToastContainer />
        </>
      ) : (
        <LinksGrid />
      )}
    </div>
  );
}
