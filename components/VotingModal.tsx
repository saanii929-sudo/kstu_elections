"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, Package } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface BulkVotePackage {
  _id: string;
  amount: number;
  votes: number;
  currency: string;
  description?: string;
}

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  nominee: {
    _id: string;
    name: string;
    image?: string;
    categoryName?: string;
  };
  awardId: string;
  categoryId: string;
  votingCost: number;
  allowBulkVoting?: boolean;
}

const VotingModal = ({
  isOpen,
  onClose,
  onSuccess,
  nominee,
  awardId,
  categoryId,
  votingCost,
  allowBulkVoting = false,
}: VotingModalProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"normal" | "bulk">("normal");
  const [numberOfVotes, setNumberOfVotes] = useState(1);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkPackages, setBulkPackages] = useState<BulkVotePackage[]>([]);
  const [selectedPackage, setSelectedPackage] =
    useState<BulkVotePackage | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const totalAmount =
    !allowBulkVoting || activeTab === "normal"
      ? numberOfVotes * votingCost
      : selectedPackage?.amount || 0;

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("normal");
      setNumberOfVotes(1);
      setPhone("");
      setIsProcessing(false);
      setSelectedPackage(null);
    } else {
      fetchBulkPackages();
    }
  }, [isOpen]);

  const fetchBulkPackages = async () => {
    setLoadingPackages(true);
    try {
      const response = await fetch(
        `/api/bulk-vote-packages?awardId=${awardId}&onlyActive=true`,
      );
      const data = await response.json();
      if (data.success) {
        setBulkPackages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch bulk packages:", error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleVoteCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setNumberOfVotes(value);
    }
  };

  const initializeHubtelPayment = async () => {
    try {
      const email = `${phone}@ussd.pawavotes.com`;
      
      const voteData =
        allowBulkVoting && activeTab === "bulk" && selectedPackage
          ? {
              awardId,
              categoryId,
              nomineeId: nominee._id,
              email: email.toLowerCase(),
              phone,
              numberOfVotes: selectedPackage.votes,
              amount: selectedPackage.amount,
              bulkPackageId: selectedPackage._id,
            }
          : {
              awardId,
              categoryId,
              nomineeId: nominee._id,
              email: email.toLowerCase(),
              phone,
              numberOfVotes,
              amount: totalAmount,
            };

      const response = await fetch("/api/public/votes/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize payment");
      }

      return data;
    } catch (error: any) {
      console.error("Initialize payment error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone) {
      toast.error("Please enter your phone number");
      return;
    }

    if ((!allowBulkVoting || activeTab === "normal") && numberOfVotes < 1) {
      toast.error("Please select at least 1 vote");
      return;
    }

    if (allowBulkVoting && activeTab === "bulk" && !selectedPackage) {
      toast.error("Please select a bulk vote package");
      return;
    }

    setIsProcessing(true);

    try {
      const initData = await initializeHubtelPayment();

      if (!initData.success || !initData.checkoutUrl) {
        throw new Error("Failed to initialize payment");
      }

      // Store vote details in localStorage for success page
      const voteDetails = {
        nominee: nominee.name,
        votes: allowBulkVoting && activeTab === "bulk" ? selectedPackage!.votes : numberOfVotes,
        amount: totalAmount,
        type: allowBulkVoting && activeTab === "bulk" ? "bulk" : "normal",
        reference: initData.reference,
        timestamp: Date.now(),
      };
      localStorage.setItem('pendingVote', JSON.stringify(voteDetails));

      // Redirect to Hubtel checkout page
      window.location.href = initData.checkoutUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to process payment");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Header */}
        <div className="sticky top-0 bg-green-600 border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">Vote for Nominee</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {allowBulkVoting && (
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("normal")}
                disabled={isProcessing}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                  activeTab === "normal"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-500 hover:text-gray-700"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Heart size={16} />
                  Normal Voting
                </div>
              </button>
              <button
                onClick={() => setActiveTab("bulk")}
                disabled={isProcessing}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                  activeTab === "bulk"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-500 hover:text-gray-700"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Package size={16} />
                  Bulk Voting
                </div>
              </button>
            </div>
          )}

          {/* Nominee Info */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {nominee.image ? (
              <div className="w-16 h-16 rounded-full overflow-hidden relative shrink-0">
                {nominee.image.startsWith("data:") ? (
                  <img
                    src={nominee.image}
                    alt={nominee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={nominee.image}
                    alt={nominee.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center shrink-0">
                <Heart className="text-gray-500" size={28} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{nominee.name}</h3>
              {nominee.categoryName && (
                <p className="text-sm text-gray-600">{nominee.categoryName}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(!allowBulkVoting || activeTab === "normal") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Votes
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Enter number of votes"
                    onChange={handleVoteCountChange}
                    className="flex-1 text-center text-2xl font-bold border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  GHS {votingCost.toFixed(2)} per vote
                </p>
              </div>
            )}
            {allowBulkVoting && activeTab === "bulk" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select a Bulk Vote Package
                </label>
                {loadingPackages ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      Loading packages...
                    </p>
                  </div>
                ) : bulkPackages.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500">
                      No bulk packages available
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {bulkPackages.map((pkg) => (
                      <button
                        key={pkg._id}
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        disabled={isProcessing}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedPackage?._id === pkg._id
                            ? "border-green-600 bg-green-50"
                            : "border-gray-200 hover:border-green-300"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-green-600">
                            {pkg.votes}
                          </span>
                          <span className="text-xs text-gray-500">votes</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          {pkg.currency} {pkg.amount.toFixed(2)}
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {pkg.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          {pkg.currency} {(pkg.amount / pkg.votes).toFixed(2)}{" "}
                          per vote
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isProcessing}
                required
                placeholder="0XX XXX XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Number of Votes:</span>
                <span className="font-semibold text-gray-900">
                  {allowBulkVoting && activeTab === "bulk"
                    ? selectedPackage?.votes || 0
                    : numberOfVotes}
                </span>
              </div>
              {(!allowBulkVoting || activeTab === "normal") && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Price per Vote:</span>
                  <span className="font-semibold text-gray-900">
                    GHS {votingCost.toFixed(2)}
                  </span>
                </div>
              )}
              {allowBulkVoting && activeTab === "bulk" && selectedPackage && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Regular Price per Vote:</span>
                    <span className="font-semibold text-gray-400 line-through">
                      GHS {votingCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Bulk Price per Vote:</span>
                    <span className="font-semibold text-green-600">
                      GHS{" "}
                      {(selectedPackage.amount / selectedPackage.votes).toFixed(
                        2,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2 bg-green-100 -mx-2 px-2 py-1 rounded">
                    <span className="text-xs font-medium text-green-700">You Save:</span>
                    <span className="text-sm font-bold text-green-700">
                      GHS{" "}
                      {((votingCost * selectedPackage.votes) - selectedPackage.amount).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-green-200 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    GHS {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Heart size={18} />
                  Proceed to Payment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VotingModal;
