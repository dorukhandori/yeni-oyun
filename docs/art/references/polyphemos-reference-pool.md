# Polyphemos — dış referans havuzu (ASSET-108 öncesi)

> Bu bir kabul/onay dokümanı değil, sahibin beğendiği Sketchfab modellerinin **notu**. Hiçbiri henüz kullanılmaya karar verilmedi; nihai Polyphemos asset'i yine kurulu Tripo yoluyla (multiview-to-model + auto-rig, Doryseus emsali) üretilecek — art-bible'ın "fully original design, no resemblance to any existing game or film character" ilkesi gereği. Bu havuzun amacı: ölçek/siluet/rig kalitesi üzerine **insan gözüyle** ilham + K10 placeholder adayı taraması.
>
> Bağlam: `docs/production/implementation-spec-sprint1.md` K10 (Polyphemos placeholder — mekanik önce, ~80 kredilik gerçek mesh mekanik doğrulanmadan üretilmiyor), sahibin dış araştırma isteği ("devin hareketleri" korkusu).

## Sahibin işaretlediği 6 model (2026-08-25)

| Model | Lisans | Poli | Kullanılabilirlik | Not |
|---|---|---|---|---|
| [Walking Giant](https://sketchfab.com/3d-models/walking-giant-8e4075ae212b404386e46a453096dd9f) | Belirtilmemiş | 14,8k üçgen | 🟡 Belirsiz — indirmeden önce lisans netleşmeli | "Giant/zombi/boss" etiketli, 2016'dan. İyi bir düşük-poli ölçek referansı olabilir ama görsel açıklama yok |
| [Giant Boss (Siege of Heroes)](https://sketchfab.com/3d-models/giant-boss-from-siege-of-heroes-0942213fd46b4dd3a148a24ae8bbb6d2) | Belirtilmemiş, **indirilebilir** | 1,9k üçgen | 🔴 **Dikkat** — gerçek, var olan bir mobil oyundan türeme karakter. Art-bible'ın "mevcut oyun/film karakterine benzerlik yok" kuralıyla gerilimde, doğrudan görsel referans olarak kullanılmamalı |
| [Fantasy Monster: Giant Boss](https://sketchfab.com/3d-models/fantasy-monster-giant-boss-0adc2657f29146dda0498c0f10c54689) | **NoAI** | 7,5k üçgen, tam rig + 9 animasyon (idle/run/walk/turn/hit/death) | 🔴 **Kullanılamaz — AI pipeline'a hiç sokulamaz.** Lisansı açıkça "generative AI için veri setlerinde/girdisinde/geliştirmede kullanılamaz" diyor. Rig/animasyon kalitesi (9 klip, tam iskelet) teorik olarak tam istediğimiz şey ama **hiçbir şekilde Tripo/Gemini'ye referans verilemez** — yalnız insan gözüyle "böyle bir şey" ilhamı için bakılabilir, dosyası indirilip pipeline'a sokulmaz |
| [Moss Giant](https://sketchfab.com/3d-models/moss-giant-a3a1c18540c144c987ae64fd193aa23f) | Belirtilmemiş, muhtemelen mağaza/ücretli | 541,9k üçgen (çok yoğun) | 🟡 Konsept referansı olabilir (Xuexiang Zhang konsept sanatına dayanıyor) — indirilebilirlik/lisans doğrulanmadı |
| [Moai Head](https://sketchfab.com/3d-models/moai-head-51da6f0f88d2497cbaf9ab8a3858692f) | Belirtilmemiş, **mağaza ürünü (muhtemelen ücretli)** | 325,4k üçgen | 🟡 Kiklop'un karakteriyle doğrudan ilgisi düşük (taş heykel, karakter değil) — belki yalnız "iri/anıtsal siluet" hissi için |
| [Giant Fire Dragon](https://sketchfab.com/3d-models/giant-fire-dragon-ig-lol-fa7c6a17c93c493ba9321a13aff0c7fe) | **CC-BY** | 16,1k üçgen | 🟢 En temiz lisans, indirilebilir — ama ejderha, Kiklop'un biped/insansı formuyla ilgisi sınırlı, muhtemelen alakasız |

## Önceki turda bulunan iki aday (hâlâ geçerli)

| Model | Lisans | Poli | Not |
|---|---|---|---|
| [Ogre](https://sketchfab.com/3d-models/ogre-ee48bfe768b04d299be3f70b6d8b56d2) | CC-BY | 498,4k (çok yoğun, indirilirse azaltılmalı) | Mixamo iskeleti + hazır **yürüyüş klibi** — "dev nasıl yürümeli" video referansı için değerli |
| [Cyclops Rig](https://sketchfab.com/3d-models/cyclops-rig-e5cc86878c314f5bae6d7268bb7541d9) | CC-BY | 11,3k (makul) | Gerçekten tek gözlü, rig'li — **K10 placeholder adayı** (düz kapsülden çok daha bilgilendirici) |

## Önerilen kullanım sınırı

- **Nihai Polyphemos (ASSET-108/098):** yalnız Tripo (multiview-to-model + auto-rig), NoAI/var-olan-oyun türevi hiçbir modelin görseli/dosyası pipeline'a girmez.
- **K10 placeholder (mekanik test):** CC-BY olan **Cyclops Rig** (ya da lisansı netleşirse Walking Giant) indirilip düz kapsülün yerine kullanılabilir — bu sadece hareket/çarpışma/kamera testi, oyuna commit edilmeyecek bir ara adım.
- **İnsan-gözü ilham (dosya indirmeden, pipeline'a sokmadan):** Fantasy Monster'ın rig/animasyon yapısına (9 klip, idle/run/walk/turn/hit/death) bakıp "bizim 4 klip (idle/walk/sleep/settle) yeterli mi" diye kıyaslanabilir — NoAI kısıtı yalnız dosyanın kendisinin AI'ya girdi olmasını yasaklıyor, insanın bakıp öğrenmesini değil.

## Sonraki adım

Blender'da Sketchfab entegrasyonu açıldığında (`Use assets from Sketchfab` + API anahtarı), CC-BY olan iki adaydan (Ogre / Cyclops Rig) birini indirip gerçekten inceleyebiliriz.
