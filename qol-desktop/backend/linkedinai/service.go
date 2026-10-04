package linkedinai

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"qol-desktop/backend/ollama"
)

// ponytail: flat per-level ceiling instead of a token-rate model — this
// machine has no dGPU (2-core CPU), so real tokens/sec is unknown until
// Fase 5 benchmarking. Calibrated from a real measurement on the target
// machine (Intel i3-7020U, 2C/4T, no dGPU): ~6.5 tok/s generation, ~10 tok/s
// prompt eval, ~10s cold model load — a RAG prompt (KB chunks + activity
// JSON) alone can take 2+ minutes of prompt-eval before generation starts.
var generateTimeout = map[ollama.ReasoningLevel]time.Duration{
	ollama.ReasoningLow:    5 * time.Minute,
	ollama.ReasoningMedium: 8 * time.Minute,
	ollama.ReasoningHigh:   12 * time.Minute,
	ollama.ReasoningXHigh:  20 * time.Minute,
	ollama.ReasoningMax:    35 * time.Minute,
}

type Service struct {
	DB         *pgxpool.Pool
	AI         *ollama.Client
	ChatModel  string
	EmbedModel string
	NumCtx     int
}

type AIStatusResult struct {
	Configured bool   `json:"configured"`
	ChatModel  string `json:"chatModel"`
	Reason     string `json:"reason,omitempty"`
}

// AIStatus reports whether Ollama + the configured chat model are actually
// usable. The UI falls back to the existing deterministic template panel
// (src/lib/linkedin-format.ts) whenever Configured is false — no new
// fallback code needed on the frontend side.
func (s *Service) AIStatus(ctx context.Context) AIStatusResult {
	if err := s.AI.Ping(ctx); err != nil {
		return AIStatusResult{Configured: false, ChatModel: s.ChatModel, Reason: "Ollama tidak berjalan di 127.0.0.1:11434"}
	}
	ok, err := s.AI.HasModel(ctx, s.ChatModel)
	if err != nil {
		return AIStatusResult{Configured: false, ChatModel: s.ChatModel, Reason: err.Error()}
	}
	if !ok {
		return AIStatusResult{Configured: false, ChatModel: s.ChatModel, Reason: fmt.Sprintf("model %s belum di-pull", s.ChatModel)}
	}
	return AIStatusResult{Configured: true, ChatModel: s.ChatModel}
}

func (s *Service) loadProfile(ctx context.Context, userID string) (DraftProfile, error) {
	var nama *string
	var p DraftProfile
	err := s.DB.QueryRow(ctx,
		`SELECT nama_lengkap, prodi, instansi FROM profiles WHERE id = $1`, userID,
	).Scan(&nama, &p.Prodi, &p.Instansi)
	if err != nil && err != pgx.ErrNoRows {
		return p, err
	}
	if nama != nil {
		p.Nama = *nama
	} else {
		p.Nama = "Mahasiswa"
	}
	return p, nil
}

func (s *Service) loadActivity(ctx context.Context, userID, activityID string) (*SkmActivity, error) {
	var a SkmActivity
	a.ID = activityID
	err := s.DB.QueryRow(ctx, `
		SELECT judul, kategori, penyelenggara, tanggal_mulai::text, tanggal_selesai::text,
		       poin_skm, deskripsi, skill_tags, credential_id, tingkat, jam_sosial
		  FROM skm_activities WHERE id = $1 AND user_id = $2`,
		activityID, userID,
	).Scan(&a.Judul, &a.Kategori, &a.Penyelenggara, &a.TanggalMulai, &a.TanggalSelesai,
		&a.PoinSkm, &a.Deskripsi, &a.SkillTags, &a.CredentialID, &a.Tingkat, &a.JamSosial)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// overLimit reuses the existing bump_rate_limit SECURITY DEFINER RPC from
// supabase/schema.sql as-is via direct SQL — Go connects as the trusted
// local postgres role, so no service-role/JWT dance is needed here.
func (s *Service) overLimit(ctx context.Context, key string, windowMinutes, max int) bool {
	var over bool
	err := s.DB.QueryRow(ctx, `SELECT bump_rate_limit($1, $2, $3)`, key, windowMinutes, max).Scan(&over)
	if err != nil {
		return false // fail open, same as the original Edge Function
	}
	return over
}

func vectorLiteral(v []float32) string {
	parts := make([]string, len(v))
	for i, f := range v {
		parts[i] = fmt.Sprintf("%g", f)
	}
	return "[" + strings.Join(parts, ",") + "]"
}

// retrieve reuses match_branding_chunks (also unchanged SQL) with an
// Ollama-produced (bge-m3, 1024-dim) query embedding instead of Gemini's.
func (s *Service) retrieve(ctx context.Context, query string, matchCount int, seksi, bahasa *string) ([]Chunk, error) {
	embeddings, err := s.AI.Embed(ctx, s.EmbedModel, []string{query})
	if err != nil {
		return nil, fmt.Errorf("embedding gagal: %w", err)
	}
	rows, err := s.DB.Query(ctx,
		`SELECT konten, sumber, seksi FROM match_branding_chunks($1::vector, $2, $3, $4)`,
		vectorLiteral(embeddings[0]), matchCount, seksi, bahasa,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chunks []Chunk
	for rows.Next() {
		var c Chunk
		if err := rows.Scan(&c.Konten, &c.Sumber, &c.Seksi); err != nil {
			return nil, err
		}
		chunks = append(chunks, c)
	}
	return chunks, rows.Err()
}

func (s *Service) generate(ctx context.Context, prompt string, reasoning ollama.ReasoningLevel) (string, error) {
	numPredict, think := ollama.ReasoningParams(reasoning)
	timeout := generateTimeout[reasoning]
	if timeout == 0 {
		timeout = generateTimeout[ollama.ReasoningHigh]
	}
	reply, err := s.AI.Chat(ctx, s.ChatModel, []ollama.ChatMessage{
		{Role: "user", Content: prompt},
	}, ollama.ChatOptions{
		Temperature: 0.4,
		NumCtx:      s.NumCtx,
		NumPredict:  numPredict,
		Think:       think,
	}, timeout)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(reply), nil
}

type GenerateDraftInput struct {
	UserID     string
	ActivityID string
	Seksi      string
	Bahasa     string
	Force      bool
	Reasoning  ollama.ReasoningLevel
}

type DraftResult struct {
	Draft       string   `json:"draft"`
	Cached      bool     `json:"cached"`
	ID          string   `json:"id,omitempty"`
	SumberChunk []string `json:"sumber_chunk"`
}

func (s *Service) GenerateDraft(ctx context.Context, in GenerateDraftInput) (*DraftResult, error) {
	if !ValidSection(in.Seksi) || !ValidBahasa(in.Bahasa) {
		return nil, fmt.Errorf("parameter tidak valid")
	}

	activity, err := s.loadActivity(ctx, in.UserID, in.ActivityID)
	if err != nil {
		return nil, err
	}
	if activity == nil {
		return nil, fmt.Errorf("kegiatan tidak ditemukan")
	}
	if activity.Deskripsi != nil && LooksLikeInjection(*activity.Deskripsi) {
		return nil, fmt.Errorf("deskripsi kegiatan mengandung pola yang tidak diizinkan")
	}

	profile, err := s.loadProfile(ctx, in.UserID)
	if err != nil {
		return nil, err
	}
	inputHash := BuildInputHash(*activity, in.Seksi, in.Bahasa, profile)

	if !in.Force {
		var cached DraftResult
		err := s.DB.QueryRow(ctx, `
			SELECT id, draft FROM linkedin_drafts
			 WHERE user_id=$1 AND activity_id=$2 AND seksi=$3 AND input_hash=$4
			 ORDER BY created_at DESC LIMIT 1`,
			in.UserID, in.ActivityID, in.Seksi, inputHash,
		).Scan(&cached.ID, &cached.Draft)
		if err == nil {
			cached.Cached = true
			return &cached, nil
		}
		if err != pgx.ErrNoRows {
			return nil, err
		}
	}

	if s.overLimit(ctx, "linkedin-ai:"+in.UserID, 24*60, DailyGenerationLimit) {
		return nil, fmt.Errorf("batas %d generasi per hari tercapai. Coba lagi besok", DailyGenerationLimit)
	}

	chunks, err := s.retrieve(ctx, BuildRetrievalQuery(*activity, in.Seksi, in.Bahasa), 4, &in.Seksi, &in.Bahasa)
	if err != nil {
		return nil, fmt.Errorf("generasi AI gagal: %w", err)
	}
	prompt := BuildPrompt(chunks, *activity, in.Seksi, in.Bahasa, profile)
	draft, err := s.generate(ctx, prompt, in.Reasoning)
	if err != nil {
		return nil, fmt.Errorf("generasi AI gagal: %w", err)
	}

	var id string
	err = s.DB.QueryRow(ctx, `
		INSERT INTO linkedin_drafts (user_id, activity_id, seksi, input_hash, draft, model)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		in.UserID, in.ActivityID, in.Seksi, inputHash, draft, s.ChatModel,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	sumber := make([]string, len(chunks))
	for i, c := range chunks {
		sumber[i] = c.Sumber
	}
	return &DraftResult{Draft: draft, Cached: false, ID: id, SumberChunk: sumber}, nil
}

type ChatInput struct {
	UserID     string
	ActivityID *string
	Messages   []ChatMessage
	Reasoning  ollama.ReasoningLevel
}

type ChatResult struct {
	Reply       string   `json:"reply"`
	SumberChunk []string `json:"sumber_chunk"`
}

func (s *Service) ChatLinkedIn(ctx context.Context, in ChatInput) (*ChatResult, error) {
	if len(in.Messages) == 0 || len(in.Messages) > ChatMaxTurns*2 {
		return nil, fmt.Errorf("percakapan tidak valid")
	}
	messages := ClampMessages(in.Messages)
	for _, m := range messages {
		if LooksLikeInjection(m.Text) {
			return nil, fmt.Errorf("pesan mengandung pola yang tidak diizinkan")
		}
	}

	if s.overLimit(ctx, "linkedin-chat:"+in.UserID, ChatWindowMinutes, ChatLimitPerWindow) {
		return nil, fmt.Errorf("batas %d pesan per jam tercapai. Coba lagi sebentar lagi", ChatLimitPerWindow)
	}

	var activity *SkmActivity
	var profile *DraftProfile
	if in.ActivityID != nil {
		a, err := s.loadActivity(ctx, in.UserID, *in.ActivityID)
		if err != nil {
			return nil, err
		}
		activity = a
		if activity != nil {
			p, err := s.loadProfile(ctx, in.UserID)
			if err != nil {
				return nil, err
			}
			profile = &p
		}
	}

	bahasaID := "id"
	chunks, err := s.retrieve(ctx, BuildChatRetrievalQuery(messages), 6, nil, &bahasaID)
	if err != nil {
		return nil, fmt.Errorf("chat AI gagal: %w", err)
	}
	prompt := BuildChatPrompt(chunks, messages, activity, profile)
	reply, err := s.generate(ctx, prompt, in.Reasoning)
	if err != nil {
		return nil, fmt.Errorf("chat AI gagal: %w", err)
	}

	sumber := make([]string, len(chunks))
	for i, c := range chunks {
		sumber[i] = c.Sumber
	}
	return &ChatResult{Reply: reply, SumberChunk: sumber}, nil
}
