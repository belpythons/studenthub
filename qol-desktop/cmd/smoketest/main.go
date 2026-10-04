// Temporary Fase 3 verification harness (docs/wails-reengineering-plan.md).
// Calls the linkedinai.Service directly against the local Postgres + Ollama
// stack, bypassing the Wails GUI. Not part of `go test` — needs live services.
// Usage: go run ./cmd/smoketest <user_id> <activity_id>
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"qol-desktop/backend/linkedinai"
	"qol-desktop/backend/ollama"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("usage: go run ./cmd/smoketest <user_id> <activity_id>")
		os.Exit(1)
	}
	userID, activityID := os.Args[1], os.Args[2]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	pool, err := pgxpool.New(ctx, "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
	if err != nil {
		panic(err)
	}
	defer pool.Close()

	svc := &linkedinai.Service{
		DB:         pool,
		AI:         ollama.New("http://127.0.0.1:11434"),
		ChatModel:  "llama3.2:3b",
		EmbedModel: "bge-m3",
		NumCtx:     8192,
	}

	status := svc.AIStatus(ctx)
	fmt.Printf("AIStatus: %+v\n\n", status)
	if !status.Configured {
		fmt.Println("Ollama/model not ready — aborting.")
		os.Exit(1)
	}

	start := time.Now()
	result, err := svc.GenerateDraft(ctx, linkedinai.GenerateDraftInput{
		UserID:     userID,
		ActivityID: activityID,
		Seksi:      "experience",
		Bahasa:     "id",
		Force:      true,
		Reasoning:  ollama.ReasoningLow,
	})
	elapsed := time.Since(start)
	if err != nil {
		fmt.Println("GenerateDraft error:", err)
		os.Exit(1)
	}
	fmt.Printf("GenerateDraft took %s\n", elapsed)
	fmt.Printf("cached=%v id=%s sumber=%v\n\n--- draft ---\n%s\n", result.Cached, result.ID, result.SumberChunk, result.Draft)
}
