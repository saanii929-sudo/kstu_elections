"use client";
import { useState, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface NominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  awardId: string;
  categoryId: string;
  categoryName: string;
  awardName: string;
  nominationType: 'free' | 'fixed' | 'category';
  nominationFixedPrice?: number;
  categoryPrice?: number;
}

const NominationModal = ({
  isOpen,
  onClose,
  awardId,
  categoryId,
  categoryName,
  awardName,
  nominationType,
  nominationFixedPrice = 0,
  categoryPrice = 0,
}: NominationModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const getNominationPrice = () => {
    if (nominationType === 'free') return 0;
    if (nominationType === 'fixed') return nominationFixedPrice;
    if (nominationType === 'category') return categoryPrice;
    return 0;
  };

  const nominationPrice = getNominationPrice();
  const isPaid = nominationType !== 'free' && nominationPrice > 0;

  useEffect(() => {
    if (isOpen && isPaid) {
      // No need to load Paystack script for Hubtel
    }
  }, [isOpen, isPaid]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    // Show local preview immediately while uploading
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingImage(true);
    const loadingToast = toast.loading("Uploading image...");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/public/upload/image", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Store the R2 public URL — not a base64 string
      setFormData((prev) => ({ ...prev, image: data.url }));
      toast.success("Image uploaded successfully", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image", { id: loadingToast });
      setImagePreview("");
      setFormData((prev) => ({ ...prev, image: "" }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      if (isPaid) {
        const initResponse = await fetch("/api/public/nominations/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            awardId,
            categoryId,
            ...formData,
            amount: nominationPrice * 100,
          }),
        });

        const initData = await initResponse.json();

        if (!initData.success) {
          throw new Error(initData.error || "Failed to initialize payment");
        }

        // Store nomination details in localStorage for success page
        const nominationDetails = {
          name: formData.name,
          email: formData.email,
          categoryName: categoryName,
          awardName: awardName,
          amount: nominationPrice,
          reference: initData.reference,
          timestamp: Date.now(),
        };
        localStorage.setItem('pendingNomination', JSON.stringify(nominationDetails));

        // Redirect to Hubtel checkout page
        window.location.href = initData.checkoutUrl;
      } else {
        // Free nomination
        const response = await fetch("/api/public/nominations/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            awardId,
            categoryId,
            ...formData,
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success("Nomination submitted successfully! Awaiting approval.");
          onClose();
          // Reset form
          setFormData({ name: "", email: "", phone: "", bio: "", image: "" });
          setImagePreview("");
        } else {
          toast.error(data.error || "Failed to submit nomination");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit nomination");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Header */}
          <div className="sticky top-0 bg-green-600 text-white border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Submit Nomination
              </h2>
              <p className="text-xs sm:text-sm text-white mt-1">
                {awardName} • {categoryName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white cursor-pointer hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Image (Optional)
              </label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="text-gray-400" size={32} />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload Image
                      </>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Max size: 5MB. Formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="your.email@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+233 XX XXX XXXX"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (Optional)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Price Info */}
            {isPaid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-800 font-semibold">
                    Nomination Fee:
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    GHS {nominationPrice.toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-green-600">
                  {nominationType === 'fixed' && 'Fixed price for all categories'}
                  {nominationType === 'category' && `Price for ${categoryName} category`}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  You will be redirected to payment after submitting
                </p>
              </div>
            )}

            {nominationType === 'free' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Free Nomination</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Your nomination will be submitted for admin approval
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading || uploadingImage}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isPaid ? "Proceed to Payment" : "Submit Nomination"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NominationModal;
