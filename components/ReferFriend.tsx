"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // Kapat butonu için
  DialogClose, // Kapat butonu için
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Referans linkini göstermek için
import { useAuthUser } from "@/hooks/useAuthUser"; // Giriş yapmış kullanıcı bilgilerini almak için
import {
  FaUserPlus,
  FaCopy,
  FaCheck,
} from "react-icons/fa"; // İkonlar
import { Skeleton } from "@/components/ui/skeleton"; // Yükleme durumu için

// TODO: Backend'den toplam referans sayısını çekecek fonksiyon (şimdilik placeholder)
async function fetchTotalReferrals(
  userId: string
): Promise<number> {
  console.log(
    "fetchTotalReferrals çağrıldı, userId:",
    userId
  );
  // Bu fonksiyon, Supabase'den veya API endpoint'inizden
  // belirtilen kullanıcının kaç kişiyi referans ettiğini çekmeli.
  // Örneğin:
  // const { count, error } = await supabase
  //   .from('users')
  //   .select('*', { count: 'exact', head: true })
  //   .eq('referrer_wallet_address', currentUserWalletAddress); // veya referrer_id'ye göre
  // if (error) throw error;
  // return count ?? 0;
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simüle edilmiş ağ gecikmesi
  return Math.floor(Math.random() * 100); // Geçici rastgele bir sayı
}

export function ReferralDialog() {
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
      // Mevcut sayfanın URL'sini alıp ?ref=cuzdanAdresi ekleyelim
      // Production'da site adınızı doğru almanız gerekebilir.
      // Şimdilik window.location.origin kullanıyoruz.
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://siteadi.com";
      setReferralLink(
        `${origin}/?ref=${user.wallet_address}`
      );
    }
  }, [user]);

  useEffect(() => {
    if (dialogOpen && user?.id && totalReferrals === null) {
      const loadReferrals = async () => {
        setIsLoadingReferrals(true);
        try {
          const count = await fetchTotalReferrals(user.id);
          setTotalReferrals(count);
        } catch (error) {
          console.error(
            "Referans sayısı çekilemedi:",
            error
          );
          setTotalReferrals(0); // Hata durumunda 0 göster
        } finally {
          setIsLoadingReferrals(false);
        }
      };
      loadReferrals();
    }
  }, [dialogOpen, user, totalReferrals]);

  const handleCopyToClipboard = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // 2 saniye sonra "Kopyalandı" durumunu sıfırla
    } catch (err) {
      console.error("Referans linki kopyalanamadı: ", err);
      // Kullanıcıya bir hata mesajı gösterebilirsiniz
    }
  };

  if (isUserLoading) {
    return <Skeleton className="h-10 w-36" />; // Buton için skeleton
  }

  if (!user) {
    return null; // Kullanıcı giriş yapmamışsa butonu gösterme (veya "Giriş Yap"a yönlendir)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center   h-5  md:h-10 bg-blue-200 rounded-full p-4.5">
          <FaUserPlus className="mr-2 h-4 w-4" /> Refer a
          Friend
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
          {isCopied && (
            <p className="text-xs text-green-400 mt-1">
              Link copied to clipboard!
            </p>
          )}
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
            {/* Buraya gelecekte referanslardan kazanılan toplam puan gibi başka istatistikler eklenebilir */}
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
}
