package main

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"qol-desktop/backend/linkedinai"
	"qol-desktop/backend/ollama"
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// App struct
type App struct {
	ctx    context.Context
	ai     *linkedinai.Service
	dbErr  error
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods. DB connects lazily/best-effort: if the
// local Supabase Postgres isn't up yet, AIStatus just reports not-configured
// instead of crashing the app.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	dbURL := getenv("SUPABASE_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		a.dbErr = err
	}

	a.ai = &linkedinai.Service{
		DB:         pool,
		AI:         ollama.New(getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")),
		ChatModel:  getenv("LLM_CHAT_MODEL", "llama3.2:3b"),
		EmbedModel: getenv("LLM_EMBED_MODEL", "bge-m3"),
		NumCtx:     8192,
	}
}

// AIStatus reports whether the local Ollama model is up. The frontend badge
// and the AI panel visibility both key off this.
func (a *App) AIStatus() linkedinai.AIStatusResult {
	if a.dbErr != nil {
		return linkedinai.AIStatusResult{Configured: false, Reason: a.dbErr.Error()}
	}
	return a.ai.AIStatus(a.ctx)
}

// GenerateDraftRequest is the JS-facing shape (snake_case to match the old
// Edge Function body, so linkedin-client.ts needs a minimal diff).
type GenerateDraftRequest struct {
	UserID     string `json:"user_id"`
	ActivityID string `json:"activity_id"`
	Seksi      string `json:"seksi"`
	Bahasa     string `json:"bahasa"`
	Force      bool   `json:"force"`
	Reasoning  string `json:"reasoning"` // low|medium|high|xhigh|max
}

func (a *App) GenerateDraft(req GenerateDraftRequest) (*linkedinai.DraftResult, error) {
	bahasa := req.Bahasa
	if bahasa == "" {
		bahasa = "id"
	}
	reasoning := ollama.ReasoningLevel(req.Reasoning)
	if reasoning == "" {
		reasoning = ollama.ReasoningHigh
	}
	return a.ai.GenerateDraft(a.ctx, linkedinai.GenerateDraftInput{
		UserID:     req.UserID,
		ActivityID: req.ActivityID,
		Seksi:      req.Seksi,
		Bahasa:     bahasa,
		Force:      req.Force,
		Reasoning:  reasoning,
	})
}

type ChatLinkedInRequest struct {
	UserID     string                  `json:"user_id"`
	ActivityID *string                 `json:"activity_id,omitempty"`
	Messages   []linkedinai.ChatMessage `json:"messages"`
	Reasoning  string                  `json:"reasoning"`
}

func (a *App) ChatLinkedIn(req ChatLinkedInRequest) (*linkedinai.ChatResult, error) {
	reasoning := ollama.ReasoningLevel(req.Reasoning)
	if reasoning == "" {
		reasoning = ollama.ReasoningHigh
	}
	return a.ai.ChatLinkedIn(a.ctx, linkedinai.ChatInput{
		UserID:     req.UserID,
		ActivityID: req.ActivityID,
		Messages:   req.Messages,
		Reasoning:  reasoning,
	})
}
