# Replikasi "BRiGHT AI" dengan Ollama (Model Lokal)

Dokumen konfigurasi untuk membangun ulang platform **BRiGHT AI — AI & Document Analyzer**
(PT Badak NGL, `http://10.10.1.187`, "Badak AI v2.0") memakai **Ollama** sebagai mesin model
lokal, dengan cloud API opsional sebagai fallback.

> Dibuat dari riset read-only pada instance yang berjalan (login manual oleh pemilik akun).
> Tanggal riset: 15 Sep 2026.

---

## 1. Hasil Riset (ringkas) — apa yang direplikasi

### 1.1 Identitas & arsitektur
| Aspek | Temuan |
|---|---|
| Nama | BRiGHT AI / "Badak AI v2.0" — *Document Intelligence & Technical Vision* |
| Akses | `http://10.10.1.187` (IP privat, LAN-only) |
| Backend | Ada `/api/v1/studio/...`; setting **disimpan di database**; ada file config `studio_data/pricing.json`; workspace per-percakapan (folder hash) di server |
| Model lokal | **Ollama** eksplisit (label: *"Nama model lokal (Ollama) otomatis memakai GPU lokal"*), endpoint `http://127.0.0.1:11434` |

### 1.2 Model yang ditemukan
**Lokal (Ollama, GPU, gratis):**
- `gpt-oss:20b` — model chat & agent default
- `gemma4:31b-64k` — vision, konteks 64k
- `glm-4.7-flash:32k` — konteks 32k
- `qwen3-embedding:8b` — **embedding untuk memori/RAG**
- (terlihat dipakai juga: `qwen3.6-27b`, `openai/gpt-oss-120b`, dan **`openai/gpt-oss-safeguard-20b` untuk moderasi/guardrail**)

**Cloud (API berbayar, opsional):** Anthropic (Claude Haiku 4.5 / Opus 4.8 / Sonnet 5), DeepSeek
(`deepseek-v4-pro`), Moonshot (`kimi-k3`), OpenAI (GPT 5.4–6), xAI (Grok 4.x), Qwen `qwen3.8-max`,
Groq (`groq/compound`).

### 1.3 Pengaturan LLM (per-fitur, tersimpan di DB)
| Fitur | Model | Endpoint |
|---|---|---|
| **Chatbot** | `gpt-oss:20b` | `http://127.0.0.1:11434/v1/chat/completions` (Ollama, OpenAI-compat) |
| **Evaltek** (analisis dok) | `deepseek-v4-pro` | `https://api.deepseek.com/v1/chat/completions` |
| **Cloudeka** (slot cloud aktif / OpenAI-compat) | `kimi-k3` (doc+vision) | `https://api.moonshot.ai/v1/chat/completions` |
| **Ollama** (GPU lokal) | `gpt-oss:20b` | `http://127.0.0.1:11434/api/generate` (native) |
- **Provider Aktif**: dipilih sebagai fallback otomatis. Tiap provider punya tombol **Test Koneksi**.
- Pola kunci: **nama model → menentukan jalur** (nama lokal = GPU lokal; nama cloud = URL+key).

### 1.4 Cara model "berpikir"
- **Kedalaman berpikir** (reasoning effort) 5 tingkat: `Rendah → Sedang → Tinggi (default) → Sangat tinggi → Maksimal`.
- **Agent**: effort `low/medium/high(default)/xhigh/max`, max step ± 40.
- **Auto mode**: merutekan tugas → model (mis. *"Membuat gambar → Claude Sonnet 5"*, *"Mode Agen · sdk"*).
- Tidak ada system prompt yang terekspos di UI → berada di backend (kita definisikan sendiri, lihat §3).

### 1.5 Agent (harness alat)
- Dua engine: **SDK** (Claude Agent SDK, full harness) dan **"Harness sendiri"** (custom, untuk model non-Claude).
- Tools: **Read / Write / Edit / Bash / Glob / Grep / WebSearch** — berlaku semua model, sesi resumable.
- Jalan di server, di **workspace per-user**; file dilayani via `/api/v1/studio/agent/file`.
- Routing model via alias provider (`alt1`=Anthropic … `alt8`=OpenAI, `default`=lokal).

### 1.6 Memori / RAG
- Panel **Memori**: fakta persisten tentang user, kategori `fakta` / `proyek`, + **ringkasan otomatis percakapan**.
- **Embedding `qwen3-embedding:8b`**; saat riset: *733 memori · 126 ringkasan percakapan*.
- Ada aksi tambah manual & "Lupakan semua".

### 1.7 Analisis Dokumen (pipeline)
- Upload multi-file: **PDF · IMG · DOCX · XLSX · PPTX · MPP**.
- **Perbaiki Dokumen** = peningkatan kualitas OCR untuk scan resolusi rendah.
- Mode: *Umum, Evaltek Compliance, Gambar Teknis (P&ID/Diagram, vision), Evaltek v2 (Ref→Ranking Vendor), Cek Typo, PDF Editor (gabung/hapus/putar/redaksi/kompres/→Office), OCR→Teks (→Word/Excel)*.
- Mode laporan: *Gabungan / Per Dokumen / Komparasi Vendor*.
- Model: doc = `deepseek-v4-pro`, vision = `kimi-k3`.

### 1.8 Keamanan & governance
- Login **email `@badaklng.com` + 2FA Google Authenticator (OTP 6 digit)**; RBAC role `user`/`admin`.
- **Log Akses** ala nginx/apache: `waktu · user · IP · metode · path/status`; klien di **LAN 10.x** (mis. `10.131.23.10`); logging termasuk *pra-login*.
- **Prompt caching** aktif (cache read tarif 10% — hemat besar).
- **Kuota biaya bulanan per-user** (mis. Rp 1.650.000); saat habis → *fallback ke model lokal gratis* atau *tolak permintaan*.
- Metering biaya per **model / fitur / user**; fitur diukur: `agent-sdk`, `chat`, `agent-pc`.
- **Guardrail/moderasi** via model `gpt-oss-safeguard-20b`.

---

## 2. Rekomendasi Model Ollama (padanan setara)

> Beberapa nama model di instance asli lebih baru dari rilis publik. Untuk tiap peran, di bawah ini
> padanan Ollama yang **kapabilitasnya setara**. Selalu cek tag terbaru di `ollama.com/library`
> saat deploy — desainnya sengaja dibuat **mudah diganti** (lihat env var §6).

| Peran di BRiGHT AI | Model asli | Padanan Ollama (rekomendasi) | Alternatif | Catatan |
|---|---|---|---|---|
| Chat umum / default | `gpt-oss:20b` | **`gpt-oss:20b`** (sudah Ollama) | `qwen3:30b`, `llama3.3:70b` | Reasoning bawaan (low/med/high). Ringan di 1 GPU 16–24 GB. |
| Chat "berat" / agent | `claude-sonnet-5` (auto) | **`qwen3:32b`** atau **`gpt-oss:120b`** | `deepseek-r1:70b` | Untuk tool-calling & tugas panjang. |
| Analisis dokumen (teks) | `deepseek-v4-pro` | **`deepseek-r1:32b`** | `qwen3:32b`, `qwen2.5:32b` | Reasoning kuat untuk compliance/ranking. |
| Vision (gambar/P&ID) | `gemma4:31b-64k`, `kimi-k3` | **`qwen2.5vl:32b`** | `gemma3:27b` (vision+128k), `llama3.2-vision:11b` | Diagram teknis butuh vision + konteks besar. |
| Model "flash"/cepat | `glm-4.7-flash:32k` | **`glm4:9b`** | `qwen3:8b`, `gemma3:12b` | Untuk jawaban cepat & hemat. |
| Embedding (RAG/memori) | `qwen3-embedding:8b` | **`bge-m3`** (multibahasa, kuat utk B.Indonesia) | `nomic-embed-text`, `mxbai-embed-large`, `qwen3-embedding` | `bge-m3` 1024-dim, konteks 8k. |
| Guardrail / moderasi | `gpt-oss-safeguard-20b` | **`llama-guard3:8b`** | `gpt-oss-safeguard` (bila tersedia) | Klasifikasi input/output aman/tidak. |

**Konteks (num_ctx) yang meniru asli:** vision 64k → `num_ctx 65536`; flash 32k → `num_ctx 32768`;
chat default → 16k–32k. Sesuaikan dengan VRAM (konteks besar = VRAM besar).

---

## 3. Modelfile Ollama — meniru gaya "berpikir" & batasan

Buat satu Modelfile per peran, lalu `ollama create <nama> -f <file>`. System prompt di bawah
meniru asisten berbahasa Indonesia, sadar-konteks Badak LNG, dengan reasoning bertingkat.

### 3.1 Chat default — `bright-chat`
```dockerfile
# Modelfile.bright-chat
FROM gpt-oss:20b

# --- Parameter runtime (setara "Kedalaman berpikir: Tinggi") ---
PARAMETER temperature 0.4
PARAMETER top_p 0.9
PARAMETER num_ctx 16384
PARAMETER num_predict 2048
# gpt-oss membaca level reasoning dari system prompt: Low/Medium/High.

SYSTEM """
Anda adalah BRiGHT AI, asisten AI internal PT Badak NGL (kilang LNG, Bontang).
Bahasa utama: Indonesia; boleh Inggris bila diminta. Ringkas, akurat, tanpa berlebihan.

Reasoning: High.
Berpikir bertahap secara internal untuk soal teknik/analisis; tampilkan hanya kesimpulan
dan langkah penting, bukan seluruh proses berpikir.

Domain: LNG, engineering, IT, pengadaan/tender, dokumen korporat.
Batasan:
- Jangan mengarang angka/spesifikasi. Bila tak yakin, katakan tidak yakin.
- Untuk perbandingan vendor/harga, tampilkan asumsi & sumber.
- Patuhi data internal; jangan bocorkan rahasia ke luar konteks.
"""
```
> **Mengatur "Kedalaman berpikir" saat runtime** tanpa membuat model baru: kirim override.
> - gpt-oss: ganti baris `Reasoning:` di system message (`Low`/`Medium`/`High`) per request.
> - Model reasoning (deepseek-r1, qwen3): gunakan flag `think` API Ollama (`"think": true|false`)
>   dan/atau `num_predict` lebih besar untuk "Sangat tinggi/Maksimal".
> Peta saran: Rendah→`think:false, num_predict 512` · Sedang→`1024` · Tinggi→`2048` ·
> Sangat tinggi→`think:true, 4096` · Maksimal→`think:true, 8192`.

### 3.2 Analisis dokumen — `bright-evaltek`
```dockerfile
# Modelfile.bright-evaltek
FROM deepseek-r1:32b
PARAMETER temperature 0.2
PARAMETER num_ctx 32768
PARAMETER num_predict 4096
SYSTEM """
Anda mesin analisis dokumen BRiGHT AI (mode Evaltek).
Tugas: ringkasan, cek kepatuhan (compliance), komparasi & ranking vendor terhadap spesifikasi acuan.
Aturan:
- Kutip bagian dokumen yang jadi dasar tiap kesimpulan (halaman/section bila ada).
- Untuk ranking vendor: buat tabel kriteria → skor → alasan, lalu peringkat akhir.
- Jangan menilai di luar bukti dokumen. Tandai data yang hilang.
Output rapi dalam Markdown (heading, tabel, poin).
"""
```

### 3.3 Vision / gambar teknis — `bright-vision`
```dockerfile
# Modelfile.bright-vision
FROM qwen2.5vl:32b
PARAMETER temperature 0.2
PARAMETER num_ctx 32768
SYSTEM """
Anda penganalisis gambar & diagram teknik (P&ID, skematik, foto lapangan) untuk BRiGHT AI.
Deskripsikan komponen, tag, aliran, dan anomali secara terstruktur. Bila teks pada gambar penting,
baca (OCR) dan cantumkan. Jangan menebak bila buram; minta gambar lebih jelas.
"""
```

### 3.4 Guardrail — `bright-guard`
```dockerfile
# Modelfile.bright-guard
FROM llama-guard3:8b
# Dipakai sebagai pra-filter (cek prompt) & pasca-filter (cek jawaban).
```
Pemakaian: panggil `bright-guard` untuk mengklasifikasi input user dan output model sebelum
ditampilkan; jika `unsafe`, tolak/redaksi. (Meniru peran `gpt-oss-safeguard-20b`.)

---

## 4. Whitelist (diterapkan di layer aplikasi / reverse-proxy — BUKAN di Ollama)

> Ollama tidak punya whitelist bawaan. Semua kontrol akses dipasang di **reverse proxy (Nginx)**
> dan **backend aplikasi**. Ollama sendiri **hanya di-bind ke localhost** (lihat §6) agar tak
> bisa diakses langsung dari jaringan.

### 4.1 Whitelist domain email (login)
Enforce di backend saat login/registrasi:
```python
ALLOWED_EMAIL_DOMAINS = {"badaklng.com"}          # dari ENV, koma-separated
def email_allowed(email: str) -> bool:
    return email.lower().rsplit("@", 1)[-1] in ALLOWED_EMAIL_DOMAINS
```
Tambahan (sesuai asli): **2FA TOTP** (Google Authenticator) + **RBAC** role `user`/`admin`.

### 4.2 Whitelist IP / network (Nginx)
```nginx
# /etc/nginx/conf.d/bright-ai.conf
geo $bright_allowed {
    default 0;
    10.0.0.0/8      1;      # LAN korporat Badak (klien terlihat di 10.131.x.x)
    127.0.0.1/32    1;
}
server {
    listen 80;
    server_name 10.10.1.187;

    if ($bright_allowed = 0) { return 403; }

    # rate limit sederhana (lihat http{} untuk zone)
    limit_req zone=bright burst=20 nodelay;

    location / { proxy_pass http://127.0.0.1:8000; }   # backend app
    # Ollama TIDAK di-proxy keluar. Hanya backend yang memanggilnya di localhost.
}
# di blok http{}:
# limit_req_zone $binary_remote_addr zone=bright:10m rate=10r/s;
```

### 4.3 Whitelist tipe file (upload)
```python
# Chat attach (sesuai asli): pdf, doc(x), xls(x), ppt(x), csv
# Analisis dokumen: pdf, img, docx, xlsx, pptx, mpp
ALLOWED_UPLOAD_EXT = {
    "chat":     {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv"},
    "analyzer": {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff",
                 ".docx", ".xlsx", ".pptx", ".mpp"},
}
MAX_UPLOAD_MB = 50
# Validasi ekstensi + MIME (magic bytes), bukan sekadar nama file.
```

---

## 5. Workflow yang direplikasi + komponen open-source

### 5.1 Diagram alur (upload → proses → retrieval → chat)
```
                 ┌─────────────────── Reverse Proxy (Nginx) ───────────────────┐
                 │  IP allowlist (LAN 10/8) · TLS · rate-limit · access log     │
Browser (LAN) ──▶│                                                             │
                 └───────────────┬─────────────────────────────────────────────┘
                                 ▼
                    ┌──────────────────────────┐   login: domain @badaklng.com + TOTP + RBAC
                    │   Backend App (FastAPI)   │   metering biaya/kuota · guardrail · cache
                    └───┬───────────┬───────────┘
        ┌───────────────┘           └───────────────┐
        ▼ (chat)                                     ▼ (analisis dokumen)
  ┌───────────────┐                          ┌──────────────────────────────┐
  │ Guardrail     │  llama-guard3            │ Ingest: OCR/parse             │
  │ (pra-filter)  │                          │  • OCRmyPDF/Tesseract (scan)  │
  └──────┬────────┘                          │  • Unstructured/Docling       │
         ▼                                    │    (docx/xlsx/pptx/pdf)       │
  ┌───────────────┐   embed query            └───────────────┬──────────────┘
  │ Retrieval RAG │◀── bge-m3 (Ollama) ──┐                    ▼ chunk + embed (bge-m3)
  │ (vector DB)   │                       │            ┌──────────────┐
  │  Qdrant       │──── top-k context ────┤            │  Vector DB   │
  └──────┬────────┘                       │            │  (Qdrant)    │
         ▼                                │            └──────┬───────┘
  ┌───────────────┐  prompt+konteks       │                   │ retrieval saat analisis
  │  LLM (Ollama) │◀──────────────────────┘                   ▼
  │  gpt-oss:20b… │──────────────────────────────────▶  Analisis (deepseek-r1 / qwen2.5vl)
  └──────┬────────┘                                            │
         ▼ jawaban                                             ▼ laporan (gabungan/per-dok/vendor)
  ┌───────────────┐  cek output                          ┌──────────────┐
  │ Guardrail     │  llama-guard3                        │ Workspace &  │
  │ (pasca-filter)│                                      │ file output  │
  └──────┬────────┘                                      └──────────────┘
         ▼
   Simpan ke Memori: fakta + ringkasan percakapan → embed (bge-m3) → Vector DB
```

### 5.2 Komponen open-source (padanan tiap fungsi asli)
| Fungsi di BRiGHT AI | Komponen open-source |
|---|---|
| Mesin model lokal | **Ollama** |
| Backend/orkestrasi | **FastAPI** (custom) atau **Dify** / **Open WebUI** bila mau siap-pakai; **LangChain/LlamaIndex** untuk pipeline |
| Agent harness (Read/Write/Edit/Bash/Glob/Grep/WebSearch) | **Claude Agent SDK** (bisa arahkan ke model lokal via OpenAI-compat), atau **OpenHands** / **Aider** untuk full-lokal |
| OCR & perbaikan scan | **OCRmyPDF + Tesseract**; **ocrmypdf --deskew --clean** untuk "Perbaiki Dokumen" |
| Parsing dokumen (docx/xlsx/pptx/pdf) | **Unstructured** atau **Docling** (IBM) — Docling bagus untuk tabel & P&ID |
| Vector DB (RAG/memori) | **Qdrant** (rekomendasi) · alternatif **Chroma**, **pgvector** |
| Embedding | **bge-m3** via Ollama |
| Guardrail/moderasi | **llama-guard3** via Ollama |
| Konversi PDF↔Office | **LibreOffice --headless**, **pdf2docx**, **pypandoc** |
| PDF Editor (gabung/putar/redaksi/kompres) | **pikepdf** / **PyMuPDF (fitz)**, **qpdf**, **ghostscript** |
| Metering biaya/token & kuota | tabel usage di DB (mirror `pricing.json`) + middleware hitung token (`tiktoken`/respons Ollama `eval_count`) |
| Prompt caching | cache konteks berulang (mis. **Redis**) + `keep_alive` Ollama untuk model tetap panas |
| Reverse proxy / whitelist / log | **Nginx** (§4) |
| 2FA TOTP | **pyotp** + qrcode |

---

## 6. Catatan konfigurasi (env var & runtime — mudah di-reuse)

### 6.1 Environment variables (backend)
```dotenv
# ---- Model per fitur (nama = jalur; ganti kapan saja) ----
LLM_CHAT_MODEL=gpt-oss:20b
LLM_ANALYZER_MODEL=deepseek-r1:32b
LLM_VISION_MODEL=qwen2.5vl:32b
LLM_FLASH_MODEL=glm4:9b
LLM_EMBED_MODEL=bge-m3
LLM_GUARD_MODEL=llama-guard3:8b

# ---- Endpoint lokal (Ollama) ----
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_OPENAI_URL=http://127.0.0.1:11434/v1     # OpenAI-compatible

# ---- Fallback cloud opsional (kosongkan untuk full-lokal) ----
CLOUD_PROVIDER=                                  # mis. deepseek | moonshot | anthropic
CLOUD_BASE_URL=
CLOUD_API_KEY=
FALLBACK_ON_QUOTA=local                           # local | reject

# ---- Reasoning effort default ----
REASONING_DEFAULT=high                             # low|medium|high|xhigh|max
AGENT_MAX_STEPS=40

# ---- Whitelist & keamanan ----
ALLOWED_EMAIL_DOMAINS=badaklng.com
ALLOWED_CIDRS=10.0.0.0/8,127.0.0.1/32
REQUIRE_TOTP=true
MAX_UPLOAD_MB=50

# ---- Governance ----
MONTHLY_BUDGET_IDR=1650000
PRICING_FILE=studio_data/pricing.json
```

### 6.2 Runtime Ollama (di server model)
```bash
# Bind localhost saja (jangan expose ke LAN — akses lewat backend/proxy)
export OLLAMA_HOST=127.0.0.1:11434

# Jaga model tetap panas (mengurangi latensi, dukung "prompt caching" praktis)
export OLLAMA_KEEP_ALIVE=30m

# Paralelisme sesuai VRAM
export OLLAMA_NUM_PARALLEL=2
export OLLAMA_MAX_LOADED_MODELS=3
export OLLAMA_FLASH_ATTENTION=1        # hemat VRAM utk konteks besar

# Tarik model
ollama pull gpt-oss:20b
ollama pull deepseek-r1:32b
ollama pull qwen2.5vl:32b
ollama pull glm4:9b
ollama pull bge-m3
ollama pull llama-guard3:8b

# Buat varian ber-system-prompt
ollama create bright-chat    -f Modelfile.bright-chat
ollama create bright-evaltek -f Modelfile.bright-evaltek
ollama create bright-vision  -f Modelfile.bright-vision
```

### 6.3 Contoh panggilan (override reasoning per request)
```bash
# Chat (OpenAI-compat) — set reasoning via system message
curl http://127.0.0.1:11434/v1/chat/completions -H 'Content-Type: application/json' -d '{
  "model": "bright-chat",
  "messages": [
    {"role":"system","content":"Reasoning: Maksimal."},
    {"role":"user","content":"Sebutkan 3 unit proses utama kilang LNG, jawab singkat."}
  ]
}'

# Native + toggle "think" (model reasoning: deepseek-r1/qwen3)
curl http://127.0.0.1:11434/api/chat -d '{
  "model":"bright-evaltek",
  "messages":[{"role":"user","content":"Bandingkan Vendor A vs B terhadap spesifikasi acuan."}],
  "think": true,
  "options": {"temperature":0.2, "num_ctx":32768, "num_predict":8192}
}'
```

### 6.4 Peta "Kedalaman berpikir" → parameter
| UI (asli) | gpt-oss (`Reasoning:`) | deepseek-r1/qwen3 | num_predict |
|---|---|---|---|
| Rendah | Low | `think:false` | 512 |
| Sedang | Medium | `think:false` | 1024 |
| Tinggi *(default)* | High | `think:true` | 2048 |
| Sangat tinggi | High | `think:true` | 4096 |
| Maksimal | High | `think:true` | 8192 |

---

## 7. Ringkasan penerapan (checklist)
1. Server GPU: install Ollama, `OLLAMA_HOST=127.0.0.1`, pull + `create` model (§6).
2. Backend (FastAPI): routing model per-fitur via ENV; login domain+TOTP+RBAC; metering & kuota; guardrail pra/pasca.
3. Ingest: OCRmyPDF/Tesseract + Unstructured/Docling → chunk → embed `bge-m3` → **Qdrant**.
4. RAG/memori: simpan fakta + ringkasan percakapan, retrieval top-k saat chat/analisis.
5. Nginx: IP allowlist (LAN 10/8), rate-limit, TLS, access log; Ollama tidak diekspos.
6. Semua model/param lewat ENV → ganti model/tweak tanpa ubah kode (reusable untuk project lain).

> **Fleksibilitas**: karena model & endpoint dipilih lewat ENV/DB (meniru pola "nama model → jalur"
> di aslinya), mengganti `gpt-oss:20b` ke model lain, atau menambah fallback cloud, cukup ubah satu
> variabel — tidak menyentuh logika aplikasi.
