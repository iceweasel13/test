import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

// Next.js dinamik rota için params tipi
interface PageProps {
  params: Promise<{ wallet_address: string }>;
}

export default async function DashboardPage({
  params,
}: PageProps) {
  // params Promise'ını çöz
  const { wallet_address } = await params;

  // Supabase istemcisi oluştur
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Oturum kontrolü
  if (error || !user) {
    redirect("/");
  }

  // Cüzdan adresi doğrulama (Ethereum tarzı)
  const isValidWalletAddress = /^0x[a-fA-F0-9]{40}$/.test(
    wallet_address
  );
  if (!isValidWalletAddress) {
    redirect("/");
  }

  // Kullanıcının cüzdan adresiyle URL'deki adresin eşleştiğini kontrol et
  // Not: user.wallet_address'in Supabase kullanıcı metadata'sında veya bir tabloda saklandığını varsayıyorum
  if (
    user.user_metadata?.wallet_address?.toLowerCase() !==
    wallet_address.toLowerCase()
  ) {
    redirect("/");
  }

  return (
    <DashboardClient
      wallet_address={wallet_address}
      user={user}
    />
  );
}
