import { useMemo } from "react";

const useErc20Abi = () => {
  return useMemo(
    () => [
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
      {
        name: "name",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ internalType: "string", name: "", type: "string" }],
      },
      {
        name: "symbol",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ internalType: "string", name: "", type: "string" }],
      },
      {
        name: "decimals",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      },
    ],
    []
  );
};

export default useErc20Abi;