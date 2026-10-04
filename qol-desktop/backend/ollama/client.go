// Package ollama is a minimal HTTP client for a local Ollama daemon
// (http://127.0.0.1:11434), replacing the Gemini SDK calls the app used to
// make from supabase/functions/linkedin-ai.
package ollama

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	BaseURL string
	HTTP    *http.Client
}

func New(baseURL string) *Client {
	return &Client{BaseURL: baseURL, HTTP: &http.Client{}}
}

func (c *Client) post(ctx context.Context, path string, body any, out any, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("ollama %s: %w", path, err)
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama %s: status %d: %s", path, res.StatusCode, string(data))
	}
	return json.Unmarshal(data, out)
}

// Ping checks the daemon is reachable at all (used for AIStatus).
func (c *Client) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/api/tags", nil)
	if err != nil {
		return err
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama /api/tags: status %d", res.StatusCode)
	}
	return nil
}

// HasModel reports whether a model tag has already been pulled.
func (c *Client) HasModel(ctx context.Context, name string) (bool, error) {
	var out struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/api/tags", nil)
	if err != nil {
		return false, err
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return false, err
	}
	defer res.Body.Close()
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return false, err
	}
	for _, m := range out.Models {
		if m.Name == name || m.Name == name+":latest" {
			return true, nil
		}
	}
	return false, nil
}

// Embed calls POST /api/embed for one or more inputs in a single batch.
func (c *Client) Embed(ctx context.Context, model string, inputs []string) ([][]float32, error) {
	var out struct {
		Embeddings [][]float32 `json:"embeddings"`
	}
	err := c.post(ctx, "/api/embed", map[string]any{
		"model": model,
		"input": inputs,
	}, &out, 15*time.Second)
	if err != nil {
		return nil, err
	}
	if len(out.Embeddings) != len(inputs) {
		return nil, fmt.Errorf("ollama embed: got %d embeddings for %d inputs", len(out.Embeddings), len(inputs))
	}
	return out.Embeddings, nil
}

type ChatMessage struct {
	Role    string `json:"role"` // "system" | "user" | "assistant"
	Content string `json:"content"`
}

type ChatOptions struct {
	Temperature float64
	NumCtx      int
	NumPredict  int
	Think       bool
}

// Chat calls POST /api/chat with streaming disabled and returns the reply text.
func (c *Client) Chat(ctx context.Context, model string, messages []ChatMessage, opts ChatOptions, timeout time.Duration) (string, error) {
	var out struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}
	body := map[string]any{
		"model":    model,
		"messages": messages,
		"stream":   false,
		"options": map[string]any{
			"temperature": opts.Temperature,
			"num_ctx":     opts.NumCtx,
			"num_predict": opts.NumPredict,
		},
	}
	if opts.Think {
		body["think"] = true
	}
	if err := c.post(ctx, "/api/chat", body, &out, timeout); err != nil {
		return "", err
	}
	if out.Message.Content == "" {
		return "", fmt.Errorf("ollama chat: model tidak mengembalikan teks")
	}
	return out.Message.Content, nil
}
