import { Transaction } from "@mysten/sui/transactions";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { FaStore } from "react-icons/fa";
import Image from "next/image";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { useNetworkVariable } from "../app/providers";
import { useAuthUser } from "../hooks/useAuthUser";
import { bcs } from "@mysten/sui/bcs";

// Mock cards data
const cards = [
  {
    id: 1,
    name: "Mini Puff",
    image: "/fish.png",
    clicks: 1000,
    price: 0.1,
    card_type: 1,
  },
  {
    id: 2,
    name: "Mega Puff",
    image: "/fish.png",
    clicks: 3000,
    price: 0.25,
    card_type: 2,
  },
  {
    id: 3,
    name: "Wale Puff",
    image: "/fish.png",
    clicks: 7500,
    price: 0.5,
    card_type: 3,
  },
];

export function ShopDialog() {
  const packageId = useNetworkVariable("puffyPackageId");
  const suiClient = useSuiClient();
  const { user, isLoading: authLoading } = useAuthUser();
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } =
    useSignAndExecuteTransaction();

  const purchaseCard = async (card: {
    id: number; // card objesine id ekledim, loglama için faydalı olabilir
    card_type: number;
    name: string;
    clicks: number;
    price: number;
  }) => {
    if (!user) {
      alert("Lütfen önce giriş yapın.");
      return;
    }
    if (!account) {
      alert("Lütfen cüzdanınızı bağlayın.");
      return;
    }
    if (user.wallet_address !== account.address) {
      alert(
        "Giriş yapılan cüzdan adresi ile bağlı cüzdan adresi uyuşmuyor."
      );
      return;
    }
    if (
      !packageId ||
      !/^(0x)?[0-9a-fA-F]{64}$/.test(
        packageId.replace(/^0x/, "")
      )
    ) {
      alert(
        "Geçersiz akıllı sözleşme (package) adresi. Lütfen yapılandırmayı kontrol edin."
      );
      console.error("Invalid packageId:", packageId);
      return;
    }

    console.log(
      `[ShopDialog] Purchasing card: ${card.name} (Type: ${card.card_type}, Price: ${card.price} SUI)`
    );
    console.log(
      `[ShopDialog] User: ${user.wallet_address}, Current Account: ${account.address}`
    );
    console.log(`[ShopDialog] Package ID: ${packageId}`);

    try {
      const tx = new Transaction(); // Yeni Transaction bloğu oluştur

      const cardPriceInMist = BigInt(
        Math.ceil(card.price * 1_000_000_000)
      ); // Fiyatı MIST'e çevir
      const estimatedGasFee = BigInt(20_000_000); // Tahmini gas ücreti (0.02 SUI), kendi işlemine göre ayarla

      // Gas bütçesini ayarla (işlemin maksimum ne kadar gas tüketebileceği)
      tx.setGasBudget(estimatedGasFee);

      // Ödeme için gerekli SUI miktarını ana gas coin'inden ayır.
      // `tx.gas` özel bir inputtur ve cüzdandaki SUI coinlerini temsil eder.
      // `signAndExecuteTransaction` bu `tx.gas`'ı cüzdandaki uygun SUI'lerle çözümler.
      const [paymentCoin] = tx.splitCoins(tx.gas, [
        cardPriceInMist,
      ]);

      // Akıllı sözleşmedeki mint_nft fonksiyonunu çağır
      tx.moveCall({
        target: `${packageId}::puffy_nft::mint_nft`,
        arguments: [
          tx.pure(bcs.u8().serialize(card.card_type)), // card_type'ı u8 olarak serialize et
          paymentCoin, // Ödeme için ayrılan coin objesi
        ],
      });

      console.log(
        "[ShopDialog] Transaction block prepared:",
        JSON.stringify(tx.blockData, null, 2)
      );

      signAndExecute(
        {
          transaction: tx,
          // options: { showEffects: true, showEvents: true }, // Gerekirse işlem sonrası daha fazla detay için
        },
        {
          onSuccess: async (result) => {
            // result tipi: { digest: string, certificate?: SuiTransactionBlockResponseOptions, effects?: SuiTransactionBlockResponseOptions }
            console.log(
              "[ShopDialog] Transaction signed and sent successfully! Digest:",
              result.digest
            );
            alert(
              `İşlem gönderildi! Digest: ${result.digest}. Zincir üzerinde onay bekleniyor...`
            );

            try {
              // İşlemin zincir üzerinde sonucunu bekle ve detaylarını al
              const txDetails =
                await suiClient.waitForTransaction({
                  digest: result.digest,
                  options: {
                    showEvents: true,
                    showEffects: true,
                  },
                });

              console.log(
                "[ShopDialog] Transaction details from waitForTransaction:",
                txDetails
              );

              if (
                txDetails.effects?.status.status !==
                "success"
              ) {
                const errorMessage = `İşlem zincir üzerinde başarısız oldu. Hata: ${
                  txDetails.effects?.status.error ||
                  "Bilinmeyen hata"
                }`;
                alert(errorMessage);
                console.error(
                  "[ShopDialog] On-chain transaction failed:",
                  txDetails.effects?.status.error,
                  txDetails
                );
                return;
              }

              // MintEvent'i bul
              const mintEvent = txDetails.events?.find(
                (e: any) =>
                  e.type ===
                  `${packageId}::puffy_nft::MintEvent`
              );

              if (!mintEvent) {
                alert(
                  "Satın alma olayı (MintEvent) bulunamadı. İşlem başarılı olabilir, ancak beklenen olay yayınlanmadı."
                );
                console.error(
                  "[ShopDialog] Expected MintEvent not found. Available events:",
                  txDetails.events
                );
                // Bu durumda backend'i yine de güncellemeyi veya NFT'nin kullanıcıya transfer olup olmadığını kontrol etmeyi düşünebilirsin.
                return;
              }

              console.log(
                "[ShopDialog] MintEvent found:",
                mintEvent.parsedJson
              );

              const purchasedClicks = parseInt(
                mintEvent.parsedJson?.clicks as string
              );
              const walletAddressFromEvent = mintEvent
                .parsedJson?.buyer as string;

              if (
                isNaN(purchasedClicks) ||
                !walletAddressFromEvent
              ) {
                alert(
                  "Olay verisi ayrıştırılırken hata oluştu. Click sayısı güncellenemedi."
                );
                console.error(
                  "[ShopDialog] Failed to parse clicks or buyer from MintEvent",
                  mintEvent.parsedJson
                );
                return;
              }

              // Backend'e satın alınan click sayısını güncelleme isteği
              const updateResponse = await fetch(
                "/api/user/purchaseClicks",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    wallet_address: walletAddressFromEvent, // Event'ten gelen adresi kullan
                    purchased_clicks: purchasedClicks,
                  }),
                }
              );

              if (!updateResponse.ok) {
                const errorData = await updateResponse
                  .json()
                  .catch(() => ({
                    message:
                      "Satın alma bilgisi sunucuda güncellenemedi (yanıt parse edilemedi).",
                  }));
                alert(
                  `Hata: ${
                    errorData.message ||
                    "Satın alma bilgisi sunucuda güncellenemedi."
                  }`
                );
                console.error(
                  "[ShopDialog] Failed to update purchased clicks on backend:",
                  errorData
                );
                return;
              }

              alert(
                `${card.name} başarıyla satın alındı! Hesabınıza ${purchasedClicks} click eklendi.`
              );
              console.log(
                `[ShopDialog] ${card.name} purchased, ${purchasedClicks} clicks added for ${walletAddressFromEvent}.`
              );
            } catch (waitError: any) {
              alert(
                `İşlem sonucu beklenirken bir hata oluştu: ${waitError.message}`
              );
              console.error(
                "[ShopDialog] Error waiting for transaction or processing its result:",
                waitError
              );
            }
          },
          onError: (error: any) => {
            // error tipi TRPCClientError olabilir veya DApp Kit'in kendi hata tipi
            // Hata mesajının yapısını kontrol et
            let displayMessage =
              "İşlem sırasında bir hata oluştu.";
            if (error.message) {
              displayMessage = error.message;
            } else if (typeof error === "string") {
              displayMessage = error;
            }
            // "No valid gas coins" hatasını daha spesifik yakala
            if (
              displayMessage.includes(
                "No valid gas coins"
              ) ||
              displayMessage.includes(
                "Cannot find enough coins to pay for gas"
              )
            ) {
              displayMessage =
                "İşlem için cüzdanınızda yeterli SUI (gas ücreti için) bulunamadı. Lütfen bakiyenizi kontrol edin ve tekrar deneyin. Testnet kullanıyorsanız faucet kullanabilirsiniz.";
            }

            alert(`Hata: ${displayMessage}`);
            console.error(
              "[ShopDialog] Transaction signing/execution failed:",
              error
            );
          },
        }
      );
    } catch (error: any) {
      alert(
        `Transaction hazırlarken bir hata oluştu: ${error.message}`
      );
      console.error(
        "[ShopDialog] Error preparing transaction:",
        error
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center w-16 h-5 md:w-24 md:h-10 bg-blue-200 rounded-full p-4.5">
          <FaStore className="w-5 h-5 md:w-6 md:h-6" />
          <span className="hidden md:inline text-sm md:text-lg font-semibold text-white">
            Shop
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-blue-700 text-white max-w-xs sm:max-w-md md:max-w-3xl rounded-xl shadow-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-white">
            Puff Shop
          </DialogTitle>
          <DialogDescription className="text-white/80 text-sm sm:text-base">
            Bir puff seç ve daha fazla click kazan!
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 flex flex-col items-center"
            >
              <Image
                src={card.image}
                alt={card.name}
                width={100}
                height={100}
                className="rounded-md mb-2"
              />
              <h3 className="text-base sm:text-lg font-semibold">
                {card.name}
              </h3>
              <p className="text-sm mb-2">
                {card.clicks.toLocaleString()} Click
              </p>
              <Button
                variant="secondary"
                className="bg-white text-black hover:bg-slate-100 text-sm sm:text-base"
                onClick={() => purchaseCard(card)}
                disabled={
                  isPending ||
                  authLoading ||
                  !user ||
                  !account
                }
              >
                {isPending ? (
                  <p>loading</p>
                ) : (
                  `${card.price} SUI ile Satın Al`
                )}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShopDialog;
