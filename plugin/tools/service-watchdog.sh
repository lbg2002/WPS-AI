#!/usr/bin/env bash
set -u

NODE_BIN=""
SCRIPT_PATH=""
ROOT_DIR=""
STATIC_PORT="${LINGXI_STATIC_PORT:-3889}"
PROXY_PORT="${PROXY_PORT:-3890}"
LOG_PATH=""
IDLE_SECONDS=30
POLL_SECONDS=2
START_NOW=0

while [ $# -gt 0 ]; do
  case "$1" in
    --node) NODE_BIN="${2:-}"; shift 2 ;;
    --script) SCRIPT_PATH="${2:-}"; shift 2 ;;
    --root) ROOT_DIR="${2:-}"; shift 2 ;;
    --static-port) STATIC_PORT="${2:-3889}"; shift 2 ;;
    --proxy-port) PROXY_PORT="${2:-3890}"; shift 2 ;;
    --log) LOG_PATH="${2:-}"; shift 2 ;;
    --idle-seconds) IDLE_SECONDS="${2:-30}"; shift 2 ;;
    --poll-seconds) POLL_SECONDS="${2:-2}"; shift 2 ;;
    --start-now) START_NOW=1; shift ;;
    *) shift ;;
  esac
done

[ -z "$ROOT_DIR" ] && ROOT_DIR="$HOME/.lingxi-ai"
[ -z "$SCRIPT_PATH" ] && SCRIPT_PATH="$ROOT_DIR/tools/serve-permanent.js"
[ -z "$LOG_PATH" ] && LOG_PATH="$ROOT_DIR/server.log"

log() {
  mkdir -p "$(dirname "$LOG_PATH")" 2>/dev/null || true
  printf '[%s] [watchdog] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >>"$LOG_PATH" 2>/dev/null || true
}

has_wps() {
  if command -v pgrep >/dev/null 2>&1; then
    ps -axo comm,args 2>/dev/null |
      grep -E '(^|/)(wps|et|wpp|pdf|wpsoffice)( |$)|WPSOffice|Kingsoft|wps\.app' |
      grep -Ev '(/Preview|-Embedding|/from_prome|/prome-prestart-type=|Run[[:space:]]+-Entry=|CefRenderEntryPoint|promecefpluginhost|--type=renderer)' |
      grep -v grep >/dev/null 2>&1 && return 0
  fi
  ps -axo comm,args 2>/dev/null |
    grep -E '(^|/)(wps|et|wpp|pdf|wpsoffice)( |$)|WPSOffice|Kingsoft' |
    grep -Ev '(/Preview|-Embedding|/from_prome|/prome-prestart-type=|Run[[:space:]]+-Entry=|CefRenderEntryPoint|promecefpluginhost|--type=renderer)' |
    grep -v grep >/dev/null 2>&1
}

port_open() {
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$STATIC_PORT" >/dev/null 2>&1
    return $?
  fi
  (echo >"/dev/tcp/127.0.0.1/$STATIC_PORT") >/dev/null 2>&1
}

start_service() {
  port_open && return 0
  if [ ! -x "$NODE_BIN" ]; then log "node missing or not executable: $NODE_BIN"; return 0; fi
  if [ ! -f "$SCRIPT_PATH" ]; then log "script missing: $SCRIPT_PATH"; return 0; fi

  log "starting node service on $STATIC_PORT/$PROXY_PORT"
  (
    cd "$ROOT_DIR" || exit 0
    LINGXI_STATIC_PORT="$STATIC_PORT" PROXY_PORT="$PROXY_PORT" \
      "$NODE_BIN" "$SCRIPT_PATH" --root "$ROOT_DIR" >>"$LOG_PATH" 2>&1 < /dev/null &
  ) || log "failed to start node service"
}

stop_service() {
  log "stopping node service after idle"
  ps -axo pid=,comm=,args= 2>/dev/null | while read -r pid comm args; do
    case "$comm" in
      *node*)
        case "$args" in
          *"$ROOT_DIR/tools/serve-permanent.js"*|*"$ROOT_DIR/tools/proxy-server.js"*|*"$ROOT_DIR/plugin-wps/tools/proxy-server.js"*|*"$ROOT_DIR/plugin-et/tools/proxy-server.js"*|*"$ROOT_DIR/plugin-wpp/tools/proxy-server.js"*|*"$ROOT_DIR/plugin-pdf/tools/proxy-server.js"*)
            kill -9 "$pid" >/dev/null 2>&1 || true
            ;;
        esac
        ;;
    esac
  done
}

log "watchdog started; idleSeconds=$IDLE_SECONDS pollSeconds=$POLL_SECONDS startNow=$START_NOW"

LAST_SEEN=0
if [ "$START_NOW" = "1" ]; then
  LAST_SEEN="$(date +%s)"
  start_service
fi

while true; do
  NOW="$(date +%s)"
  if has_wps; then
    LAST_SEEN="$NOW"
    start_service
  elif [ "$LAST_SEEN" != "0" ] && [ $((NOW - LAST_SEEN)) -ge "$IDLE_SECONDS" ]; then
    stop_service
    LAST_SEEN=0
  fi
  sleep "$POLL_SECONDS"
done
