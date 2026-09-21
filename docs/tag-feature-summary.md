# Tag System & Board Highlighting Architecture

Dokumentasi arsitektur dan fungsionalitas sistem klasifikasi otomatis serta navigasi visual papan Lost & Found.

---

## 1. System Overview

Sistem ini dirancang untuk mengotomatisasi pengelompokan barang dan memudahkan penelusuran visual di papan Lost & Found:

- **Zero-Friction Auto-Tagging**: Pengguna tidak dibebani pemilihan kategori manual saat melapor. Sistem secara otomatis mengenali jenis barang dari judul dan deskripsi laporan menggunakan kamus ekspresi reguler (Regex) berkecepatan tinggi (0ms) dengan dukungan AI sebagai cadangan (*fallback*).
- **Minimalist Card Interface**: Kartu barang berfokus pada ilustrasi ikon retro yang bersih tanpa label teks bertumpuk, menjaga tata letak kartu tetap rapi.
- **Visual Highlighting & Dimming**: Filtrasi barang bekerja secara non-destruktif tanpa menyembunyikan kartu dari papan. Kartu yang sesuai kriteria akan disorot secara visual, sementara kartu lainnya diredupkan.
- **Dedicated Gamepad Controller**: Navigasi kategori diakses melalui panel gamepad retro di sisi kiri papan, dilengkapi layar LCD kecil sebagai indikator kategori atau status yang sedang aktif.

---

## 2. Category & Tag Taxonomy with Regex Rules

Klasifikasi otomatis tahap pertama menggunakan aturan ekspresi reguler (Regex) untuk mencocokkan kata kunci laporan secara instan (0ms) sebelum menggunakan model AI sebagai cadangan (*fallback*).

### A. Gadget
| Sub-Tag | Label | Pola Regex | Contoh Kata Kunci |
| :--- | :--- | :--- | :--- |
| `hp` | HP | `\b(hp\|handphone\|smartphone\|ponsel\|telepon\|iphone\|samsung\|xiaomi\|redmi\|oppo\|vivo\|realme\|infinix\|poco\|pixel\|android\|ios\|rog phone)\b/i` | iPhone, Samsung, Xiaomi, Redmi, Oppo, Vivo, Poco, Android |
| `laptop` | Laptop | `\b(laptop\|macbook\|notebook\|thinkpad\|asus\|acer\|lenovo\|dell\|pavilion\|rog\|tuf\|legion\|ideapad\|msi\|chromebook)\b/i` | MacBook, ThinkPad, Asus ROG, Lenovo Legion, Chromebook |
| `tws` | TWS | `\b(tws\|airpod\w*\|earbud\w*\|headset\|earphone\|headphone\|buds\|galaxy buds\|head-set\|ear-phone)\b/i` | AirPods, Earbuds, Headset, Galaxy Buds, TWS |
| `casan` | Casan | `\b(casan\|charger\|kabel data\|type[- ]?c\|lightning\|adapter\|adaptor\|powerbank\|power bank\|colokan\|kabel cas)\b/i` | Charger, Type-C, Lightning, Adapter, Powerbank, Kabel cas |
| `kalkulator` | Kalkulator | `\b(kalkulator\|calculator\|casio\|citiz\w*)\b/i` | Kalkulator Casio, Citizen, Calculator |
| `smartwatch` | Smartwatch | `\b(smartwatch\|smart watch\|apple watch\|mi band\|garmin\|fitbit\|galaxy watch\|smart band\|jam pintar)\b/i` | Apple Watch, Mi Band, Garmin, Galaxy Watch |

### B. Apparel & Accessories
| Sub-Tag | Label | Pola Regex | Contoh Kata Kunci |
| :--- | :--- | :--- | :--- |
| `kacamata` | Kacamata | `\b(kacamata\|kaca mata\|sunglasses\|eyewear\|frame kacamata)\b/i` | Kacamata minus, Sunglasses, Frame kacamata |
| `jaket` | Jaket | `\b(jaket\|jacket\|hoodie\|sweater\|cardigan\|rompi\|outer\|parka\|varsity\|windbreaker\|almamater\|jas lab)\b/i` | Jaket almamater, Hoodie, Sweater, Jas lab, Cardigan |
| `sepatu` | Sepatu | `\b(sepatu\|sneaker\w*\|pantofel\|boots\|flat shoes\|heels\|sandal\|sendal\|vans\|converse\|nike\|adidas\|ventela\|compass)\b/i` | Sneaker Vans/Converse/Ventela, Sandal, Pantofel |
| `tas` | Tas | `\b(tas\|ransel\|backpack\|tote bag\|totebag\|waist bag\|waistbag\|sling bag\|slingbag\|carrier\|tas punggung\|tas jinjing\|tas selempang)\b/i` | Tas ransel, Tote bag, Sling bag, Tas selempang |
| `perhiasan` | Perhiasan | `\b(perhiasan\|cincin\|kalung\|gelang\|anting\|liontin\|emas\|perak\|jewelry\|bracelet\|necklace\|ring)\b/i` | Cincin perak, Gelang emas, Kalung, Anting |
| `kaos_kaki` | Kaos Kaki | `\b(kaos kaki\|kaoskaki\|socks)\b/i` | Kaos kaki hitam/putih, Socks |
| `topi` | Topi | `\b(topi\|beanie\|bucket hat\|cap\|snapback\|kupluk\|baret)\b/i` | Topi snapback, Bucket hat, Beanie, Kupluk |

### C. Personal Belongings
| Sub-Tag | Label | Pola Regex | Contoh Kata Kunci |
| :--- | :--- | :--- | :--- |
| `kunci` | Kunci | `\b(kunci\|key\|kontak\|remote\|gantungan kunci\|vario\|beat\|scoopy\|nmax\|pcx\|aerox\|mio\|cbr\|ninja\|klx\|brio\|avanza\|innova\|motor\|mobil)\b/i` | Kunci motor Vario/Beat/Scoopy/NMax, Remote mobil Avanza |
| `helm` | Helm | `\b(helm\|helmet\|kyt\|ink\|nhk\|bogo\|agv\|shoei\|arai\|zeus\|cargloss\|jpn)\b/i` | Helm KYT, Bogo, Cargloss, INK, NHK |
| `dompet` | Dompet | `\b(dompet\|wallet\|purse\|pouch\|card holder\|cardholder)\b/i` | Dompet kulit, Pouch, Card holder |
| `tempat_makan` | Tempat Makan | `\b(tempat makan\|kotak makan\|lunch box\|lunchbox\|tupperware\|tumbler\|botol\|botol minum\|thermos\|termos\|mistin)\b/i` | Kotak makan Tupperware, Tumbler, Botol minum, Termos |
| `buku` | Buku | `\b(buku\|book\|binder\|novel\|komik\|catatan\|modul\|diktat\|kitab)\b/i` | Buku catatan, Binder kuliah, Modul, Diktat |
| `alat_tulis` | Alat Tulis | `\b(alat tulis\|pulpen\|bolpoin\|pen\|pensil\|pencil\|penghapus\|tipex\|tip-ex\|penggaris\|spidol\|pencil case\|kotak pensil\|tempat pensil\|stabilo)\b/i` | Pulpen, Pensil, Tip-ex, Penggaris, Kotak pensil, Stabilo |
| `make_up` | Make Up | `\b(make up\|makeup\|lipstik\|lipstick\|lip balm\|lip gloss\|bedak\|cushion\|sunscreen\|parfum\|perfume\|skincare\|eyeliner\|maskara\|mascara\|sisir\|cermin)\b/i` | Lipstik, Cushion, Sunscreen, Parfum, Bedak, Sisir |

### D. Documents & Cards
| Sub-Tag | Label | Pola Regex | Contoh Kata Kunci |
| :--- | :--- | :--- | :--- |
| `ktm` | KTM | `\b(ktm\|kartu tanda mahasiswa\|kartu mahasiswa\|id card kampus)\b/i` | Kartu Tanda Mahasiswa, KTM, ID Card Kampus |
| `ktp` | KTP | `\b(ktp\|kartu tanda penduduk\|e-ktp)\b/i` | KTP, e-KTP, Kartu Tanda Penduduk |
| `sim` | SIM | `\b(sim [abc]\|surat izin mengemudi)\b/i` | SIM C, SIM A, Surat Izin Mengemudi |
| `atm` | ATM | `\b(atm\|kartu debit\|kartu kredit\|bca\|mandiri\|bni\|bri\|bsi\|cimb\|flazz\|e-toll\|emoney\|e-money)\b/i` | Kartu ATM BCA/Mandiri/BNI/BRI, Flazz, e-Toll, e-Money |
| `kartu_praktikum` | Kartu Praktikum | `\b(kartu praktikum\|kartu lab\|kartu ujian\|kartu perpus\w*\|kartu perpustakaan)\b/i` | Kartu praktikum lab, Kartu ujian, Kartu perpustakaan |

### E. Other Items
| Sub-Tag | Label | Deskripsi | Aset Ikon |
| :--- | :--- | :--- | :--- |
| `lainnya` | Lainnya | Barang yang tidak cocok dengan pola regex maupun model AI | Mystery Box default |

---

## 3. System Flow

### A. Report & Auto-Classification Flow
```
User Submits Report
        │
        ▼
Server Classification Engine
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
Pattern Matching (Regex)      AI Fallback (LLM)
(Fast dictionary check)       (Uncommon keywords)
   │                             │
   └──────────────┬──────────────┘
                  ▼
      Assign Category & Sub-Tag
                  │
                  ▼
   Save Item & Broadcast to Clients
```

### B. Board Highlighting & Focus Flow
```
User Trigger (Gamepad / Status Button / Satpam Chat)
        │
        ▼
Highlight Store Updates Active Target
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
Target Cards Highlighted      Other Cards Dimmed
(Gold glow & pulse effect)    (Reduced opacity & grayscale)
   │                             │
   └──────────────┬──────────────┘
                  ▼
   Auto-Scroll to First Matched Item
```

### C. Satpam AI Assistant Flow
```
User Asks Satpam in Natural Language
        │
        ▼
Intent Detection & Query Processing
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
Generate Conversational Reply   Extract Highlight Criteria
   │                             │
   └──────────────┬──────────────┘
                  ▼
   Deliver Response & Focus Board Cards
```

---

## 4. Icon Asset Guidelines

Ikon kategori dan sub-tag dirender secara modular melalui komponen SVG:
- **Direktori Aset**: `web/static/assets/tags/`
- **Format**: File SVG berdimensi persegi (24x24 px atau 32x32 px) dengan gaya pixel art.
- **Konvensi Penamaan**: Menggunakan nama sub-tag dalam huruf kecil (contoh: `hp.svg`, `kunci.svg`, `ktm.svg`). Ketika file aset tersedia, sistem otomatis memprioritaskan file tersebut dibandingkan ikon bawaan.

---

## 5. Component Overview

- **Backend / Server**: Mengelola kamus klasifikasi kata kunci, integrasi model AI untuk kasus ambigu, pengayaan metadata laporan, dan deteksi maksud (*intent*) dalam percakapan Satpam AI.
- **Frontend / Web**: Mengelola state sorotan terpusat, kontroler Gamepad kategori, kartu barang dengan efek sorotan dinamis, serta rendering ikon SVG.
