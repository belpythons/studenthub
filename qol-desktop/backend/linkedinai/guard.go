package linkedinai

import "regexp"

// ponytail: regex guard instead of a dedicated safety model (llama-guard3:8b
// is too heavy for the 2-core CPU profile this app targets). Upgrade path:
// swap in a `bright-guard`-style Ollama model (see docs/ollama-ai-config.md
// §3.4) as a pre/post classifier once running on GPU hardware.
var injectionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)ignore (all|previous|above) instructions`),
	regexp.MustCompile(`(?i)abaikan (semua |seluruh )?(instruksi|perintah) (di atas|sebelumnya)`),
	regexp.MustCompile(`(?i)system prompt`),
	regexp.MustCompile(`(?i)you are now`),
	regexp.MustCompile(`(?i)kamu sekarang adalah`),
}

// LooksLikeInjection flags free-text fields that try to break out of the
// <data_kegiatan>/<percakapan> data blocks before they reach the prompt.
func LooksLikeInjection(text string) bool {
	for _, re := range injectionPatterns {
		if re.MatchString(text) {
			return true
		}
	}
	return false
}
