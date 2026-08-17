# Blurt

Memorisation practice: paste a text, type it out from memory, and compare. Works fully in the browser — no build step, no server, no dependencies.

## How it works

1. **Start** — paste or type the text you want to memorise in the *Text to memorise* box, optionally save it under a label, then press *Start practice*.
2. **Practise** — the original text is hidden. Type it out from memory; the timer starts on your first keystroke. Optionally enable *Assisted mode* for fill-in-the-blank hints of what you missed last time.
3. **Submit** — Blurt compares your attempt with the original.
4. **Review** — the result shows your score, the original with missed parts crossed out, and your attempt with added parts highlighted.

## Comparison modes

Two ways of comparing, chosen automatically:

**AI comparison (meaning-based)** — the default. A language model reads both texts and judges meaning rather than wording: synonyms, reordered phrases, and different grammar still count as remembered. Scored in points ("You remembered X of Y points"). Missing ideas are crossed out in the original; anything added that isn't in the original (fabrications) is highlighted in the attempt. A successful AI comparison also feeds the Assisted mode hints.

**Word-for-word comparison (fallback)** — used automatically when the model can't be reached (offline, no model running, failed or timed-out request). Tokens are aligned with an LCS diff — case-insensitive, punctuation at word ends ignored — and scored as words right. For very long texts (over 2000 tokens on either side) a simpler positional pairing is used instead. The result shows a note saying the word-level comparison was used.

## Assisted mode

After an AI comparison, the points you missed become hints for the *next* attempt. Difficulty levels control how much of each missed quote is shown: Easy (about half the words), Normal (about a quarter), Hard (about a tenth). Keywords — tokens containing digits, i.e. dates and numbers — are always blanked; those are the facts to recall. Hints apply to the same source text and are cleared by a perfect attempt.

## Saved texts

- Save the current text under a label (*Save text*), then reload it any time from the dropdown.
- Delete a saved text with the × button.
- *Export texts* downloads all saved texts as a JSON file.
- *Import texts* merges a JSON file back in: labels that already exist are overwritten, new labels are appended.

## Model provider

The AI comparison needs a model endpoint. Configure it in the *Model provider* card:

| Provider | Requirements |
|---|---|
| Local llama.cpp | Endpoint URL (default `http://192.168.15.115:8080/v1/chat/completions`). Thinking toggle disabled; `model` omitted. |
| DeepSeek API | API key and model name (default `deepseek-v4-flash`). Thinking mode disabled in the request. |
| Custom (OpenAI-compatible) | Endpoint URL, optional API key, model name. |

Requests time out after 120 seconds; any failure falls back to the word-for-word comparison.

## History

Every attempt is recorded with date, time taken, and score, grouped by saved-text label (or by the text itself). Click a group header to load that text back into the start screen; the × deletes one attempt; *Clear all* wipes the history.

## Data & privacy

Everything is stored in the browser's `localStorage` (`blurt.records`, `blurt.savedTexts`, `blurt.settings`, `blurt.assisted`) and never leaves your machine except the text you submit to the configured model provider when an AI comparison runs.

## Running locally

The app is static. Either open `index.html` directly or serve the directory:

```sh
python3 -m http.server 8123
# then open http://localhost:8123
```

## Files

- `index.html` — markup: start/practice/result views, model provider settings, history, help modal.
- `app.js` — all logic: state, localStorage persistence, LLM requests, comparison and diff rendering, history.
- `styles.css` — styling.
