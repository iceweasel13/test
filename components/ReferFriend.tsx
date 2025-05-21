/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  FaUserPlus,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function ReferralDialog() {
  const { user } = useAuthUser();
  const [referralLink, setReferralLink] = useState("");
  const [totalReferrals, setTotalReferrals] = useState<
    number | null
  >(null);
  const [referralBonus, setReferralBonus] = useState<
    number | null
  >(null);
  const [isLoadingReferrals, setIsLoadingReferrals] =
    useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.wallet_address) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        window.location.origin;
      setReferralLink(
        `${baseUrl}/?ref=${user.wallet_address}`
      );
    } else {
      setReferralLink("");
    }
  }, [user]);

  useEffect(() => {
    if (
      dialogOpen &&
      user?.wallet_address &&
      (totalReferrals === null || referralBonus === null)
    ) {
      const loadReferrals = async () => {
        setIsLoadingReferrals(true);
        try {
          const response = await fetch(
            `/api/user/referrals?wallet_address=${encodeURIComponent(
              user.wallet_address
            )}`
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.details ||
                data?.error ||
                "Bilinmeyen API hatası"
            );
          }

          setTotalReferrals(data.count ?? 0);
          setReferralBonus(data.referral_bonus_score ?? 0);
        } catch (error: any) {
          toast.error(
            `Referans bilgileri alınamadı: ${error.message}`
          );
          setTotalReferrals(0);
          setReferralBonus(0);
        } finally {
          setIsLoadingReferrals(false);
        }
      };

      loadReferrals();
    }
  }, [dialogOpen, user, totalReferrals, referralBonus]);

  const handleCopyToClipboard = async () => {
    if (!referralLink) return;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = referralLink;
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setIsCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error: any) {
      console.error("Copy failed:", error);
      toast.error("Link kopyalanamadı: " + error.message);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center h-5 md:h-10 hover:bg-navy-blue bg-dark-blue text-base-white  rounded-xl p-6 text-sm md:text-md font-semibold border-2 border-base-blue">
          <FaUserPlus className="h-4 w-4" /> Refer a Friend
        </Button>
      </DialogTrigger>

      <DialogContent className="border-2 border-base-blue bg-dark-blue text-base-white  rounded-xl shadow-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-base-white">
            Refer a Friend
          </DialogTitle>
          <DialogDescription className="text-base-white/80 text-sm sm:text-base">
            Share your referral link and earn 5% bonuses!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={referralLink}
              readOnly
              className="border-base-blue"
            />
            <Button
              className="bg-navy-blue hover:bg-base-blue"
              onClick={handleCopyToClipboard}
            >
              {isCopied ? (
                <FaCheck className="text-green-500" />
              ) : (
                <FaCopy />
              )}
            </Button>
          </div>

          {isLoadingReferrals ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-6 w-[150px]" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 ">
              <div className="flex flex-col mt-2 space-y-2">
                <p className="text-sm font-medium text-left">
                  Total referrals
                </p>
                <div className="flex items-center justify-center">
                  <Input
                    readOnly
                    className="text-center border bg-navy-blue border-base-blue text-2xl font-extrabold"
                    value={totalReferrals ?? 0}
                  />
                </div>
              </div>

              <div className="flex flex-col mt-2 space-y-2 ">
                <p className="text-sm font-medium text-left ">
                  Referral bonus score
                </p>
                <div className="flex items-center justify-center">
                  <Input
                    readOnly
                    className="text-center border border-base-blue bg-navy-blue text-2xl font-extrabold"
                    value={referralBonus ?? 0}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
