package ollama

// ReasoningLevel mirrors the 5-tier "Kedalaman Berpikir" control from
// docs/ollama-ai-config.md §6.4 (Rendah/Sedang/Tinggi/Sangat tinggi/Maksimal).
type ReasoningLevel string

const (
	ReasoningLow    ReasoningLevel = "low"
	ReasoningMedium ReasoningLevel = "medium"
	ReasoningHigh   ReasoningLevel = "high" // default
	ReasoningXHigh  ReasoningLevel = "xhigh"
	ReasoningMax    ReasoningLevel = "max"
)

// ReasoningParams returns the num_predict budget for a level. `think` stays
// false: the CPU-profile default model (llama3.2:3b) has no reasoning-toggle
// support. Swapping in a reasoning model (deepseek-r1/qwen3) on better
// hardware is the upgrade path — flip it on per the doc's table then.
func ReasoningParams(level ReasoningLevel) (numPredict int, think bool) {
	switch level {
	case ReasoningLow:
		return 512, false
	case ReasoningMedium:
		return 1024, false
	case ReasoningXHigh:
		return 4096, false
	case ReasoningMax:
		return 8192, false
	default: // ReasoningHigh
		return 2048, false
	}
}
