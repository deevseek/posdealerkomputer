import { useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const SUPPORT_WHATSAPP = "https://wa.me/6281330288028";

function useTopUpParams() {
  return useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const client = search.get("client") ?? "your account";
    const reason = search.get("reason") ?? "expired";

    const title = reason === "balance"
      ? "Saldo Anda kurang"
      : "Langganan telah kedaluwarsa";

    const description = reason === "balance"
      ? "Saldo Anda habis sehingga layanan otomatis dihentikan sementara. Silakan lakukan top up untuk melanjutkan layanan."
      : "Masa aktif langganan Anda telah berakhir. Lakukan perpanjangan atau top up untuk mengaktifkan kembali layanan.";

    return {
      client,
      reason,
      title,
      description,
    };
  }, []);
}

export default function TopUpPage() {
  const { client, title, description } = useTopUpParams();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-8 border border-slate-200">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-wide text-slate-500">{client}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-slate-600 leading-relaxed max-w-2xl mx-auto">{description}</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button asChild variant="default" size="lg" className="w-full">
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer">
              Hubungi admin untuk top up
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Kembali ke halaman login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
