"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export default function ApproveTransferPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const approveTransfer = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem("token");
        if (!token) {
          // Redirect to superadmin login with return URL
          const returnUrl = encodeURIComponent(window.location.pathname);
          router.push(`/superadmin/login?redirect=${returnUrl}`);
          return;
        }

        const response = await fetch(`/api/admin/transfers/${params.id}/approve`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Transfer approved successfully!");
          
          // Redirect to superadmin withdrawals page after 3 seconds
          setTimeout(() => {
            router.push("/superadmin/withdrawals");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to approve transfer");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred while approving the transfer");
      }
    };

    if (params.id) {
      approveTransfer();
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Transfer</h2>
            <p className="text-gray-600">Please wait while we approve the transfer...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Approved!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Approval Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push("/superadmin/withdrawals")}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
