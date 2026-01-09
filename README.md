# 🔬 MCDM Scholar Lab

**AI-Powered Multi-Criteria Decision Making Research Platform**

MCDM Scholar Lab, araştırmacıların MCDM (Çok Kriterli Karar Verme) makalelerini analiz etmelerini, metodolojileri öğrenmelerini ve kendi araştırmalarında bu metodolojileri uygulamalarını sağlayan yapay zeka destekli bir platformdur.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://mcdm-scholar-lab.vercel.app)

---

## 🎯 Vizyon

MCDM araştırması karmaşık bir alandır. Onlarca farklı yöntem (AHP, TOPSIS, VIKOR, PROMETHEE, MOORA, WASPAS, COPRAS, EDAS, CODAS, ARAS...), farklı sayı sistemleri (crisp, triangular fuzzy, trapezoidal fuzzy, spherical fuzzy, intuitionistic fuzzy...), farklı normalizasyon teknikleri, farklı ağırlıklandırma yöntemleri ve bunların kombinasyonları mevcuttur.

**MCDM Scholar Lab**, bu karmaşıklığı **"Lego parçaları"** gibi modüler bileşenlere ayırarak araştırmacıların:

1. 📄 Mevcut makalelerdeki metodolojileri **AI ile otomatik çıkarmasını**
2. 🧩 Bu metodolojilerin bileşenlerini **anlayıp öğrenmesini**
3. 🔧 Kendi araştırmalarında bu bileşenleri **birleştirip yeni modeller kurmasını**
4. 📊 Hesaplamaları **otomatik gerçekleştirmesini**

sağlar.

---

## ✨ Özellikler

### 📥 PDF Analizi
- Makale PDF'lerini yükleyin
- Gemini AI ile otomatik metodoloji çıkarımı
- Tüm tabloların (linguistic scale, expert evaluations, decision matrix, rankings) otomatik tanınması
- Metodoloji akışının adım adım belirlenmesi

### 🧮 MCDM Hesaplama Motoru
Desteklenen yöntemler:

| Kategori | Yöntemler |
|----------|-----------|
| **Distance-based** | TOPSIS, VIKOR, EDAS, CODAS |
| **Weighted Methods** | SAW (WSM), WPM, WASPAS |
| **Ratio Methods** | MOORA, ARAS |
| **Proportional** | COPRAS |
| **Outranking** | PROMETHEE (yakında) |
| **Pairwise** | AHP, ANP (yakında) |

### 🔢 Fuzzy Matematik Kütüphanesi
- **Fuzzy Number Types**: Triangular, Trapezoidal, Spherical, Picture, Intuitionistic
- **Fuzzification**: Crisp → Fuzzy dönüşümü (spread, scaled, gaussian)
- **Defuzzification**: Centroid, Graded Mean, Mean of Maximum, Alpha-cut
- **Fuzzy Arithmetic**: Toplama, çıkarma, çarpma, bölme, distance
- **Aggregation**: Arithmetic mean, Geometric mean, Weighted average
- **Hybrid Support**: Karışık fuzzy/crisp matris işleme

### 📊 Dilsel Ölçek Desteği
Makalelerdeki dilsel değerlendirmeleri otomatik tanır ve dönüştürür:

```
VL (Very Low)    → (0.0, 0.1, 0.3) → 0.13
L  (Low)         → (0.1, 0.3, 0.5) → 0.30
M  (Medium)      → (0.3, 0.5, 0.7) → 0.50
H  (High)        → (0.5, 0.7, 0.9) → 0.70
VH (Very High)   → (0.7, 0.9, 1.0) → 0.87
```

Özel ölçekler de desteklenir (Saaty 1-9, Fuzzy AHP, vb.)

### 👥 Uzman Değerlendirme Paneli
- Makaledeki uzman görüşlerini çıkarır
- Manuel uzman değerlendirmesi girişi
- Geometrik/aritmetik ortalama ile agregasyon
- Ağırlık hesaplama ve uygulama

### 📈 Duyarlılık Analizi
- One-at-a-time (OAT) analizi
- Yüzde varyasyon analizi
- Ekstrem senaryo testleri
- Stabilite değerlendirmesi
- Akademik metin üretimi

### 📤 Export Özellikleri
- Excel export (çoklu sheet, formüllerle)
- Grafik export (300 DPI JPEG)
- Akademik rapor üretimi

---

## 🏗️ Mimari

```
mcdm-scholar-lab/
├── api/                    # Vercel Serverless Functions
│   ├── analyze.js          # PDF analizi endpoint'i
│   ├── generate-draft.js   # Makale taslağı üretimi
│   ├── generate-ideas.js   # Araştırma fikri üretimi
│   ├── refine-analysis.js  # AI ile düzeltme
│   └── reanalyze-with-instructions.js
│
├── components/             # React Bileşenleri
│   ├── MCDMCalculator.tsx  # Ana hesaplama bileşeni
│   ├── ExpertEvaluationPanel.tsx
│   ├── SensitivityAnalysis.tsx
│   ├── NewStudyBuilder.tsx
│   └── ...
│
├── utils/                  # Hesaplama Kütüphaneleri
│   ├── mcdmEngine.ts       # 10+ MCDM yöntemi
│   └── fuzzyMath.ts        # Fuzzy matematik işlemleri
│
├── types.ts                # TypeScript tip tanımları
├── App.tsx                 # Ana uygulama
└── services/
    └── geminiService.ts    # API çağrıları
```

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Lokal Geliştirme

```bash
# Repo'yu klonla
git clone https://github.com/gururcokgungordu/mcdm-scholar-lab.git
cd mcdm-scholar-lab

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Geliştirme sunucusunu başlat
npm run dev
```

### Vercel Deploy

```bash
# Vercel CLI ile deploy
vercel

# Production deploy
vercel --prod
```

Environment Variables (Vercel Dashboard):
- `GEMINI_API_KEY` - Google Gemini API anahtarı
- `GEMINI_API_KEY_BACKUP` - Yedek API anahtarı (opsiyonel)

---

## 📖 Kullanım

### 1. Makale Yükleme
1. "Makale Yükle" sekmesine gidin
2. MCDM makalenizin PDF'ini yükleyin
3. AI analizi tamamlanana kadar bekleyin
4. Çıkarılan metodoloji, kriterler, alternatifler ve matrisi inceleyin

### 2. Hesaplama
1. Criteria & Weights panelinden ağırlıkları düzenleyin
2. Decision Matrix'ten değerleri güncelleyin
3. MCDM metodu seçin (auto veya manuel)
4. Sonuçları Results panelinde görün

### 3. Yeni Çalışma Oluşturma
1. "Yeni Çalışma" sekmesine gidin
2. Öğrenilmiş bir metodolojiyi seçin
3. Kendi kriterlerinizi ve alternatiflerinizi girin
4. Hesaplamayı çalıştırın

### 4. Duyarlılık Analizi
1. Hesaplama sonrası "Sensitivity Analysis" sekmesine gidin
2. Analiz türünü seçin
3. Sonuçları ve stabilite raporunu inceleyin

---

## 🔧 API Endpoints

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/analyze` | POST | PDF'den metodoloji çıkarımı |
| `/api/refine-analysis` | POST | AI ile veri düzeltme |
| `/api/reanalyze-with-instructions` | POST | Yönergeli yeniden analiz |
| `/api/generate-draft` | POST | Makale taslağı üretimi |
| `/api/generate-ideas` | POST | Araştırma fikri üretimi |

---

## 🧪 Desteklenen MCDM Yapılandırmaları

### Ağırlıklandırma Yöntemleri
- AHP (Analytic Hierarchy Process)
- Fuzzy AHP
- BWM (Best-Worst Method)
- CRITIC
- Entropy
- SWARA
- Equal Weights
- Direct Assignment

### Normalizasyon Teknikleri
- Vector Normalization
- Linear Max Normalization
- Min-Max Normalization
- Sum Normalization

### Fuzzy Sistemler
- Crisp (klasik)
- Triangular Fuzzy Numbers
- Trapezoidal Fuzzy Numbers
- Interval Type-2 Fuzzy
- Intuitionistic Fuzzy Sets
- Pythagorean Fuzzy Sets
- Fermatean Fuzzy Sets
- Spherical Fuzzy Sets
- Picture Fuzzy Sets
- Neutrosophic Sets

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

## 📝 Lisans

Bu proje akademik araştırma amaçlı geliştirilmektedir.

---

## 📧 İletişim

- **Geliştirici**: Gurur Cokgungordu
- **GitHub**: [@gururcokgungordu](https://github.com/gururcokgungordu)

---

## 🙏 Teşekkürler

- [Google Gemini](https://ai.google.dev/) - AI analiz motoru
- [Vercel](https://vercel.com/) - Deployment platformu
- [React](https://reactjs.org/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
