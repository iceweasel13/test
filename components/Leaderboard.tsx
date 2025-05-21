import { useAuthUser } from "@/hooks/useAuthUser";
import { ERROR_CODES } from "@/lib/errorCodes";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@radix-ui/react-dialog";
import React, { useEffect, useState } from "react";
import { FaCheck, FaCopy, FaMedal } from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { DialogHeader, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

const Leaderboard = () => {
  const { user, isLoading: isUserLoading } = useAuthUser();
  const [referralLink, setReferralLink] =
    useState<string>("");
  const [totalReferrals, setTotalReferrals] = useState<
    number | null
  >(null);
  const [isLoadingReferrals, setIsLoadingReferrals] =
    useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] =
    useState<boolean>(false);

  useEffect(() => {
    if (user?.wallet_address) {
      // Client-side'da olduğumuz için doğrudan window.location.origin kullanabiliriz.
      // Farklı bir base URL gerekiyorsa NEXT_PUBLIC_BASE_URL gibi bir env var kullanın.
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        window.location.origin;
      setReferralLink(
        `${baseUrl}/?ref=${user.wallet_address}`
      );
    } else {
      setReferralLink(""); // Kullanıcı yoksa veya çıkış yapmışsa linki temizle
    }
  }, [user]); // user null olduğunda da çalışsın ve linki temizlesin diye user?.wallet_address yerine user

  /**
   * Diyalog açıldığında referans sayısını yükler.
   */
  useEffect(() => {
    if (
      dialogOpen &&
      user?.wallet_address && // user?.id yerine wallet_address kullanmak daha tutarlı olabilir (API'nizin ne beklediğine bağlı)
      totalReferrals === null
    ) {
      const loadReferrals = async () => {
        setIsLoadingReferrals(true);
        try {
          // API endpoint'ini ve gönderilen parametreyi kontrol et
          const response = await fetch(
            `/api/user/referrals?wallet_address=${encodeURIComponent(
              user.wallet_address
            )}` // API'nizin beklediği şekilde parametre gönderin
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({
                message:
                  "API yanıtı parse edilemedi veya JSON değil",
              }));
            // Error objesinin yapısına göre hata mesajını oluştur
            const detailMessage =
              errorData.details ||
              errorData.error ||
              errorData.message;
            throw new Error(
              `API isteği başarısız: ${response.status}${
                detailMessage ? ` - ${detailMessage}` : ""
              }`
            );
          }
          const data = await response.json();
          console.log(data);
          setTotalReferrals(data.count); // API'nizin { count: number } formatında döndüğünü varsayıyoruz
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.error(
            // console.error kullanmak daha uygun
            `Hata Kodu: E020 - ${ERROR_CODES.E020}`,
            error.message
          );
          toast.error(
            `Referans sayısı alınamadı: ${error.message}`
          ); // Kullanıcıya da toast ile bilgi verilebilir
          setTotalReferrals(0);
        } finally {
          setIsLoadingReferrals(false);
        }
      };
      loadReferrals();
    }
  }, [dialogOpen, user, totalReferrals]);

  /**
   * Referans linkini panoya kopyalar.
   */
  const handleCopyToClipboard = async (): Promise<void> => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      toast.success("Referral link copied to clipboard!"); // <-- TOAST'I BURADA ÇAĞIR
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error(
        `Hata Kodu: E021 - ${ERROR_CODES.E021}`,
        err
      ); // err objesini de logla
      toast.error("Failed to copy link. Please try again."); // Hata durumunda da kullanıcıya toast ile bilgi ver
    }
  };
  /**
   * Kullanıcı yüklenirken skeleton UI gösterir.
   */
  if (isUserLoading) {
    return <Skeleton className="h-10 w-36" />;
  }

  /**
   * Kullanıcı giriş yapmamışsa diyalog butonunu gizler.
   */
  if (!user) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center h-5 md:h-10  hover:bg-navy-blue bg-dark-blue text-base-white  rounded-xl p-6 text-sm md:text-md font-semibold border-2 border-base-blue">
          <FaMedal className=" h-4 w-4" /> Leaderboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-blue-400">
            Invite Friends, Earn Rewards!
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400 pt-2">
            Share your unique referral link with friends.
            When they join and play, you will earn bonus
            rewards!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <label
            htmlFor="referralLink"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Your Referral Link:
          </label>
          <div className="flex items-center space-x-2">
            <Input
              id="referralLink"
              type="text"
              value={referralLink}
              readOnly
              className="bg-gray-700 border-gray-600 text-gray-200 focus-visible:ring-blue-500"
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={handleCopyToClipboard}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={!referralLink}
            >
              {isCopied ? (
                <FaCheck className="h-4 w-4" />
              ) : (
                <FaCopy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy link</span>
            </Button>
          </div>
          {isCopied &&
            toast("Your referral link has been copied")}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">
            Your Referral Stats
          </h3>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">
                Total Friends Referred:
              </span>
              {isLoadingReferrals ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <span className="text-xl font-bold text-white">
                  {totalReferrals ?? "N/A"}
                </span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Leaderboard;
