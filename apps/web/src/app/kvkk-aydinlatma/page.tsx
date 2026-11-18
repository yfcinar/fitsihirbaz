import { CONSENT_VERSION } from "@fit-sihirbaz/shared";

export const metadata = { title: "KVKK Aydınlatma Metni — Fit Sihirbaz" };

// UYARI: Bu metin bir TASLAKTIR. Yayına almadan önce bir hukukçu tarafından gözden geçirilmeli,
// köşeli parantezli yer tutucular gerçek bilgilerle doldurulmalıdır (VERBİS kaydı dahil).
export default function KvkkAydinlatmaPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-8 text-sm leading-relaxed text-foreground/90">
      <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-warning-foreground">
        <strong>Taslak metin.</strong> Bu aydınlatma metni henüz hukuki incelemeden geçmemiştir ve yayın öncesinde
        güncellenecektir. Sürüm: {CONSENT_VERSION}
      </div>

      <h1 className="text-2xl font-semibold text-foreground">Kişisel Verilerin Korunması Aydınlatma Metni</h1>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">1. Veri sorumlusu</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu, [ŞİRKET ÜNVANI]
          ([ADRES], [VERBİS SİCİL NO]) &quot;Fit Sihirbaz&quot; platformudur.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">2. İşlenen kişisel veriler</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Kimlik ve iletişim: ad, soyad, e-posta, telefon, şehir.</li>
          <li>
            Sağlık ve beslenme (özel nitelikli): boy, kilo ve ölçüm geçmişi, hedef kilo, sağlık notları, alerjiler ve
            beslenme tercihleri, günlük yemek ve su kayıtları, ilerleme fotoğrafları.
          </li>
          <li>Yaşam tarzı: meslek, hobiler, spor alışkanlıkları, aktivite düzeyi.</li>
          <li>İşlem: sipariş, ödeme durumu, randevu ve mesajlaşma kayıtları, oturum ve güvenlik kayıtları.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">3. İşleme amaçları</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hesabınızın oluşturulması ve hizmetin sunulması (diyet planı, takip, randevu, mesajlaşma).</li>
          <li>Size uygun diyetisyenlerin sıralanması ve planınızın kişiselleştirilmesi.</li>
          <li>Diyetisyeninizin sizi takip edebilmesi: girdiğiniz değerler, bağlı olduğunuz diyetisyen tarafından görülür.</li>
          <li>Ödeme, güvenlik ve yasal yükümlülüklerin yerine getirilmesi.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">4. Hukuki sebep ve açık rıza</h2>
        <p>
          Sağlık verileriniz KVKK m.6 uyarınca özel nitelikli kişisel veridir ve yalnızca açık rızanıza dayanarak
          işlenir. Açık rızanızı kayıt sırasında ayrıca veriyorsunuz; dilediğiniz zaman geri çekebilirsiniz. Geri
          çekmeniz, geri çekmeden önceki işlemlerin hukuka uygunluğunu etkilemez ve hizmetin sağlık verisi gerektiren
          kısımlarının sunulamamasına neden olabilir.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">5. Verilerin aktarılması</h2>
        <p>
          Verileriniz; yalnızca bağlı olduğunuz diyetisyenle, hizmet sağlayıcılarımızla (barındırma, e-posta, ödeme
          kuruluşu) ve yasal olarak yetkili kurumlarla, amaçla sınırlı olarak paylaşılır. [YURT DIŞINA AKTARIM VARSA
          BURADA BELİRTİLECEKTİR.]
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">6. Saklama süresi</h2>
        <p>Verileriniz, işleme amacının gerektirdiği süre ve yasal saklama yükümlülükleri boyunca saklanır: [SÜRELER].</p>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-foreground">7. Haklarınız</h2>
        <p>
          KVKK m.11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme veya yok
          etme, aktarıldığı üçüncü kişileri öğrenme, itiraz etme ve zarar halinde tazminat talep etme haklarına
          sahipsiniz. Başvurularınızı [BAŞVURU E-POSTA ADRESİ] üzerinden iletebilirsiniz.
        </p>
      </section>
    </article>
  );
}
