import { CONSENT_VERSION } from "@fit-sihirbaz/shared";

export const metadata = { title: "Kullanım Koşulları — Fit Sihirbaz" };

// UYARI: Bu metin bir TASLAKTIR; yayına almadan önce hukuki incelemeden geçmelidir.
export default function KullanimKosullariPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-8 text-sm leading-relaxed text-foreground/90">
      <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-warning-foreground">
        <strong>Taslak metin.</strong> Bu kullanım koşulları henüz hukuki incelemeden geçmemiştir. Sürüm:{" "}
        {CONSENT_VERSION}
      </div>

      <h1 className="text-2xl font-semibold text-foreground">Kullanım Koşulları</h1>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">1. Hizmetin kapsamı</h2>
        <p>
          Fit Sihirbaz, danışanlar ile bağımsız diyetisyenleri buluşturan bir platformdur. Platform tıbbi tavsiye vermez;
          diyet planları ilgili diyetisyenin sorumluluğundadır. Acil sağlık durumlarında lütfen sağlık kuruluşuna
          başvurunuz.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">2. Hesap ve güvenlik</h2>
        <p>
          Hesap bilgilerinizin doğruluğundan ve şifrenizin gizliliğinden siz sorumlusunuz. Başkası adına hesap
          açılamaz.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">3. Paketler, ödemeler ve randevular</h2>
        <p>
          Paketler diyetisyenler tarafından belirlenir. Paket içindeki görüşme hakları paketin geçerlilik süresiyle
          sınırlıdır. İade ve iptal koşulları: [İADE VE İPTAL POLİTİKASI].
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">4. Diyetisyenlerin yükümlülükleri</h2>
        <p>
          Diyetisyenler; unvan ve belgelerinin doğruluğundan, danışan verilerini yalnızca hizmet amacıyla kullanmaktan
          ve gizliliği korumaktan sorumludur.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">5. Kişisel veriler</h2>
        <p>
          Kişisel verileriniz{" "}
          <a href="/kvkk-aydinlatma" className="text-primary hover:underline">
            KVKK Aydınlatma Metni
          </a>{" "}
          kapsamında işlenir.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">6. Değişiklikler</h2>
        <p>Koşullar güncellenebilir; önemli değişiklikler size bildirilir. Uyuşmazlıklarda [YETKİLİ MAHKEME] yetkilidir.</p>
      </section>
    </article>
  );
}
