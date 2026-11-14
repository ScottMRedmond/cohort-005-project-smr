#!/usr/bin/env bash
# Claude Code status line: prints "Ctx: 13.4k" (current context window usage).
input=$(cat)

# Preferred: context_window.current_usage from the status line payload.
tokens=$(jq -r '
  .context_window.current_usage // empty
  | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0))
' <<<"$input" 2>/dev/null)

# Fallback: last main-chain assistant message usage in the transcript.
if [ -z "$tokens" ] || [ "$tokens" = "0" ]; then
  transcript=$(jq -r '.transcript_path // empty' <<<"$input")
  if [ -n "$transcript" ] && [ -f "$transcript" ]; then
    tokens=$(jq -s -r '
      [ .[] | select(.type == "assistant" and (.isSidechain | not) and .message.usage != null) ]
      | last | .message.usage // {}
      | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0))
    ' "$transcript" 2>/dev/null)
  fi
fi

tokens=${tokens:-0}
if [ "$tokens" -ge 1000 ]; then
  count=$(awk -v t="$tokens" 'BEGIN { printf "%.1fk", t/1000 }')
else
  count=$tokens
fi

# Same amber as Claude Code's "auto mode on" indicator (dark theme "warning": rgb(255,193,7)).
amber=$'\e[38;2;255;193;7m'
reset=$'\e[0m'
printf '%sCtx: %s%s\n' "$amber" "$count" "$reset"
