# Görsel değişiklik kapısı

> **Ne bu:** pahalı görsel değişiklikler için "önce sahip onayı, sonra kod" kuralı. Zaten fiilen uygulanan pratiği yazıya döküyor — yeni bir bürokrasi getirmiyor, var olanı adlandırıyor.
> **Tarih:** 2026-08-16 · **Yazan:** `technical-director` alt-ajanı · **Durum:** öneri, sahip onayı bekliyor.
> **Kaynak fikir:** gamestack `iteration-loop/LOOP.md` §6 ("pahalı görsel değişiklik = tek instance + insan kapısı"), `lotophagoi-problems-repo-solutions.md` S1.
> **Yetki:** bu doküman **süreç** tanımlar. Neyin güzel olduğuna karar vermez (`art-director` + sahip), neyin mekanik olduğuna karar vermez (`game-designer`).

---

## 1. Neden

Bu repoda görsel değişikliğin maliyeti asimetrik:

- **Ucuz ve geri alınabilir:** bir CSS `padding`, bir sabit tonu, bir `constants.ts` sayısı. Beğenilmezse `git checkout`.
- **Pahalı ve geri alınamaz:** üretilmiş bir asset (Gemini/Veo turu + kırpma + alpha-key + WebP + `assets.csv` satırı + `asset-registry.md` satırı + kod entegrasyonu). Beğenilmezse **tüm zincir** çöpe gider.

İkincisinin bir örneği zaten yaşandı: ASSET-052 (Hub storybook arkaplanı) üretildi, entegre edildi, **sonra** ada adlarının kontrastı düştüğü fark edildi ve `hud.css` elle yamandı. Üretimden önce sorulmuş tek bir soru ("bu arkaplanın üstünde metin okunacak mı?") o turu kısaltırdı.

İkinci bir örnek de var: 15 Ağustos'ta iki ayrı oturum aynı işi paralel yaptı (`ACTIVE_WORK.md`, roadmap K34/K35). Pahalı görsel işte paralellik, iki kez ödenmiş fatura demek.

---

## 2. Kapsam — neyin kapıya girdiği

**Kapıya girer (önce sahip onayı):**

| # | Değişiklik | Neden pahalı |
|---|---|---|
| G1 | Yeni asset üretimi (Gemini/Veo/Higgsfield turu) | Üretim + işleme + iki manifest satırı + entegrasyon zinciri |
| G2 | Var olan bir asset'in değiştirilmesi/yeniden üretilmesi | Aynı zincir + baseline'ları geçersiz kılar |
| G3 | Palet geneli CSS (ana metin/zemin renkleri, `parchment-panel`, ekran arkaplanları) | Her ekranı aynı anda etkiler, kontrast regresyonu riski |
| G4 | Post-process zincirine yeni pass (DOF, AO, LUT, SMAA) | Frame bütçesi + `hazePass` ile karışma riski (`art-bible.md` §4) |
| G5 | Tipografi değişimi (webfont ekleme, font ailesi) | Her ekrandaki her metin kutusunun boyutu değişir |
| G6 | Işıklandırma/gökyüzü/su malzemesinin karakteri | Adanın imza yüzeyleri; her karede görünür |

**Kapıya girmez (doğrudan yap):**

- Tek bir elemanın hizası/boşluğu, bir `z-index`, bir hover durumu
- `constants.ts` içindeki tuning sayısı (o `docs/design/` yetkisi, ayrı bir konu)
- Bir bug'ın görsel belirtisinin düzeltilmesi (yanlış çizilen şeyin doğru çizilmesi)
- **`art-bible.md`'de zaten onaylanmış ama uygulanmamış** bir satırın uygulanması — örn. §2'nin "Güneş halesi `#ffcf80`, bloom kaynağı" satırı. Onay zaten verilmiş; ikinci kez sormak süreci teatral yapar.

Sınırda mı? **Sor.** Bir soru bir üretim turundan ucuz.

---

## 3. Akış

```
  1. ÖNER      art-director / ilgili ajan: ne, neden, hangi doküman satırına dayanıyor
               + varsa 2-3 alternatif (ASSET-052'de 3 konsept sunuldu, bu doğru desendi)
                     |
  2. KAPI      sahip seçer / reddeder / "şunu dene" der
                     |
  3. CLAIM     ACTIVE_WORK.md'ye satır ekle (dosya/alan bildir) -> commit + push
                     |
  4. ÖLÇ       npm run test:assets   <- DEĞİŞİKLİKTEN ÖNCE, temiz baseline'ı doğrula
                     |
  5. UYGULA    üret / entegre et
                     |
  6. ÖLÇ       npm run test:assets   <- fark neydi, kasıtlı mıydı
                     |
  7. KABUL     kasıtlıysa: --update-baseline + baseline PNG'lerini gözle kontrol et
               kasıtsızsa: düzelt, 6'ya dön
                     |
  8. KAPAT     ACTIVE_WORK.md satırını kapat
```

**Kritik olan 4. adım.** Değişiklikten önce ölçmezsen, sonraki ölçümün neyi gösterdiğini bilemezsin — kendi değişikliğini mi, yoksa üç gün önce sızmış başka bir şeyi mi.

---

## 4. Tek-instance kuralı

gamestack `iteration-loop` §6'nın asıl maddesi: **pahalı görsel değişiklikte aynı anda tek oturum çalışır.**

Bu repoda somut karşılığı: G1–G6'dan biri `ACTIVE_WORK.md`'de aktifken, **başka bir oturum aynı görsel alana ikinci bir satır açmaz.** Bekler, sahiple konuşup alanı böler, ya da başka iş seçer. "Görsel alan" = aynı ekran (Title/Hub/HUD), aynı asset ailesi, ya da aynı render katmanı.

Bu, `AGENTS.md` § Çoklu-ajan koordinasyonu'nun genel kuralının **daraltılmış** hâli değil — genel kural "aynı dosya" der, bu madde "aynı görsel alan" der ve daha geniştir. İki oturum farklı dosyalara yazıp yine de aynı ekranı bozabilir (ASSET-052 + `hud.css` tam olarak bu şekilde).

---

## 5. Kapının ölçüm ayağı — `npm run test:assets` ne yakalar, ne yakalamaz

| Yakalar (makine) | Yakalamaz (insan kapısı) |
|---|---|
| Kontrast 4.5:1'in altına düştü mü (C5) | Değişiklik **güzel** mi |
| Baskın renk art-bible §2 ailesinden çıktı mı (C4) | Sanat yönü **doğru** mu |
| Ekranın %0.1'inden fazlası beklenmedik biçimde değişti mi (C6) | "NOT photoreal" ihlali |
| Manifest/isimlendirme/bütçe (C1–C3) | IP temizliği, spritesheet döngü kalitesi |

`docs/art/pipeline.md` §8'in insan maddeleri **kalkmıyor**. Ölçüm, gözü serbest bırakmak için var: makine sayılabilir olanı sayınca, sahip sayılamayana bakabilir.

---

## 6. Baseline'lar hakkında bir uyarı

`scripts/asset-qa/baselines/*.png` ve `scripts/asset-qa/baseline.json` **commit edilir** — inceleyemediğin bir baseline, baseline değildir.

Ama `--update-baseline` bir *karar*tır, bir temizlik komutu değil. Çalıştırmadan önce:

1. Değişen PNG'yi aç ve bak. Beklediğin şey mi?
2. `.asset-qa-out/*.diff.png` kırmızı bölgeleri beklediğin yerde mi?
3. Değilse baseline'ı güncelleme — bulduğun şey bir bug.

Refleks hâline gelmiş bir `--update-baseline`, kapının tamamen kapatılmasıyla aynı şeydir; sadece daha uzun sürer.

---

## 7. Açık soru

**Bu kapı ne kadar bağlayıcı?** İki okuma var ve karar sahibin:

- **(a) Norm:** yazılı beklenti, ihlali bir hata değil bir tercih. Solo geliştirici hızını korur, riski sahipte kalır.
- **(b) Kural:** G1–G6 için onaysız üretim yapılmaz, nokta. Yavaşlatır ama ASSET-052 sınıfı turları önler.

Önerim **(a)** — bu bir kişilik bir stüdyoda kuralın maliyeti faydasını geçer ve `ACTIVE_WORK.md` disiplini zaten en pahalı hatayı (paralel çalışma) kapatıyor. Ama bu senin kararın.
