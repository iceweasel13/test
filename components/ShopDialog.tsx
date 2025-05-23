// iceweasel13/test/test-6598e12895d49aefb69be4cbf083c0cbca242735/components/ShopDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useAuthUser } from "../hooks/useAuthUser"; // useAuthUser'ı import et ve refetchUser'ı alacağız
import { bcs } from "@mysten/sui/bcs";
import { cards } from "@/lib/data/cards.data";
import { toast } from "sonner"; // Sonner toast bildirimleri için import edildi
import { useClickStore } from "@/lib/stores/clickStore"; // useClickStore'u import et ve setUser'ı kullanacağız

export function ShopDialog() {
  const packageId = useNetworkVariable("puffyPackageId");
  const suiClient = useSuiClient();
  // useAuthUser'dan `refetchUser` fonksiyonunu alıyoruz. Bu fonksiyon, kullanıcının en güncel verilerini API'den çekmek için kullanılır.
  const {
    user,
    isLoading: authLoading,
    refetchUser,
  } = useAuthUser();
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } =
    useSignAndExecuteTransaction();
  // useClickStore'dan `setUser` fonksiyonunu alıyoruz. Bu fonksiyon, `ClickStore`'daki kullanıcı state'ini güncelleyecektir.
  const { setUser: setClickStoreUser } = useClickStore();

  const purchaseCard = async (card: {
    id: number;
    card_type: number;
    name: string;
    clicks: number;
    price: number;
  }) => {
    // Ön koşul kontrolleri
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    if (!account) {
      toast.error("Please connect your wallet.");
      return;
    }
    if (user.wallet_address !== account.address) {
      toast.error(
        "The logged-in wallet address does not match the connected wallet address."
      );
      return;
    }
    if (
      !packageId ||
      !/^(0x)?[0-9a-fA-F]{64}$/.test(
        packageId.replace(/^0x/, "")
      )
    ) {
      toast.error(
        "Invalid smart contract (package) address. Please check the configuration."
      );
      return;
    }

    const toastId = toast.loading(
      `Initiating purchase for ${card.name}...`
    );

    try {
      const tx = new Transaction();

      const cardPriceInMist = BigInt(
        Math.ceil(card.price * 1_000_000_000)
      );
      const estimatedGasFee = BigInt(20_000_000);

      tx.setGasBudget(estimatedGasFee);

      const [paymentCoin] = tx.splitCoins(tx.gas, [
        cardPriceInMist,
      ]);

      tx.moveCall({
        target: `${packageId}::puffy_nft::mint_nft`,
        arguments: [
          tx.pure(bcs.u8().serialize(card.card_type)),
          paymentCoin,
        ],
      });

      toast.loading("Signing and sending transaction...", {
        id: toastId,
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            toast.loading(
              "Transaction sent, awaiting confirmation on-chain...",
              { id: toastId }
            );

            try {
              const txDetails =
                await suiClient.waitForTransaction({
                  digest: result.digest,
                  options: {
                    showEvents: true,
                    showEffects: true,
                  },
                });

              if (
                txDetails.effects?.status.status !==
                "success"
              ) {
                const errorMessage = `Transaction failed on-chain. Error: ${
                  txDetails.effects?.status.error ||
                  "Unknown error"
                }`;
                toast.error(errorMessage, { id: toastId });
                return;
              }

              const mintEvent = txDetails.events?.find(
                (e: any) =>
                  e.type ===
                  `${packageId}::puffy_nft::MintEvent`
              );

              if (!mintEvent) {
                toast.error(
                  "Purchase event (MintEvent) not found. Transaction might be successful, but expected event was not emitted.",
                  { id: toastId }
                );
                return;
              }

              const purchasedClicks = parseInt(
                (mintEvent.parsedJson as { clicks: string })
                  ?.clicks as string
              );
              const walletAddressFromEvent = (
                mintEvent.parsedJson as { buyer: string }
              )?.buyer as string;

              if (
                isNaN(purchasedClicks) ||
                !walletAddressFromEvent
              ) {
                toast.error(
                  "Error parsing event data. Click count could not be updated on server.",
                  { id: toastId }
                );
                return;
              }

              toast.loading(
                "Updating clicks on server...",
                { id: toastId }
              );

              const updateResponse = await fetch(
                "/api/user/purchaseClicks",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    wallet_address: walletAddressFromEvent,
                    purchased_clicks: purchasedClicks,
                  }),
                }
              );

              if (!updateResponse.ok) {
                const errorData = await updateResponse
                  .json()
                  .catch(() => ({
                    message:
                      "Failed to update purchase info on server (response could not be parsed).",
                  }));
                toast.error(
                  `Error: ${
                    errorData.message ||
                    "Failed to update purchase info on server."
                  }`,
                  { id: toastId }
                );
                return;
              }

              toast.success(
                `${card.name} purchased successfully! ${purchasedClicks} clicks added to your account.`,
                { id: toastId }
              );

              // **Ana Düzeltme:**
              // 1. `refetchUser()` çağrısıyla `useAuthUser`'ın içindeki kullanıcı state'ini en güncel verilerle güncelleyelim.
              const freshUser = await refetchUser(); // `useAuthUser`'dan dönen güncel kullanıcıyı alırız.
              // 2. Eğer `refetchUser()` başarılı bir şekilde kullanıcı verisi döndürdüyse,
              //    bu veriyi `useClickStore`'daki `user` state'ine set ederiz.
              if (freshUser) {
                setClickStoreUser(freshUser); // `useClickStore`'daki `user` state'ini günceller.
              }
            } catch (waitError: any) {
              toast.error(
                `An error occurred while waiting for transaction result: ${waitError.message}`,
                { id: toastId }
              );
            }
          },
          onError: (error: any) => {
            let displayMessage =
              "An error occurred during transaction.";
            if (error.message) {
              displayMessage = error.message;
            } else if (typeof error === "string") {
              displayMessage = error;
            }
            if (
              displayMessage.includes(
                "No valid gas coins"
              ) ||
              displayMessage.includes(
                "Cannot find enough coins to pay for gas"
              )
            ) {
              displayMessage =
                "Insufficient SUI in your wallet for gas fees. Please check your balance and try again. If you are on Testnet, you can use a faucet.";
            }

            toast.error(`Error: ${displayMessage}`, {
              id: toastId,
            });
          },
        }
      );
    } catch (error: any) {
      toast.error(
        `An error occurred while preparing the transaction: ${error.message}`,
        { id: toastId }
      );
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center h-5 md:h-10 hover:bg-navy-blue bg-dark-blue text-base-white  rounded-xl p-6 text-sm md:text-md font-semibold border-2 border-base-blue">
          <FaStore className="w-5 h-5 md:w-6 md:h-6" />
          Shop
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-base-blue bg-dark-blue text-base-white max-w-xs sm:max-w-md md:max-w-3xl rounded-xl shadow-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-base-white">
            Puff Click Shop
          </DialogTitle>
          <DialogDescription className="text-base-white/80 text-sm sm:text-base">
            {isPending
              ? "Transaction pending, please wait..."
              : "Choose a puff and earn more clicks!"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-navy-blue backdrop-blur-lg border border-base-blue text-base-white rounded-xl p-4 flex flex-col items-center"
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
                className="bg-base-white text-dark-blue hover:bg-dark-blue hover:text-base-white text-sm sm:text-base"
                onClick={() => purchaseCard(card)}
                disabled={
                  isPending ||
                  authLoading ||
                  !user ||
                  !account
                }
              >
                {isPending ? (
                  <p>Loading...</p>
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
