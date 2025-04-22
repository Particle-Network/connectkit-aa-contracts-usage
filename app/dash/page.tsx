"use client";

import { useAccount } from "@particle-network/connectkit";

export default function Dashboard() {
  const account = useAccount();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <p className="text-gray-600">
            Connected Address: {account.address || "Not connected"}
          </p>
        </div>
      </div>
    </div>
  );
}
