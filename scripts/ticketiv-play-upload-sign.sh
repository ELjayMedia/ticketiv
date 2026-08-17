#!/usr/bin/env bash
#
# Build and verify the upload-signed Ticketiv consumer Play bundle.
#
# The signing password is typed into this terminal, held only in this shell's
# memory, and passed to keytool/Gradle through the environment. It is never
# echoed, written to disk, or placed on a command line where `ps` could read it.
#
# Usage:
#   scripts/ticketiv-play-upload-sign.sh                     # use the existing keystore
#   scripts/ticketiv-play-upload-sign.sh --rotate-keystore   # archive it, generate a fresh one
#
set -euo pipefail
set +x                      # never trace: the password lives in this shell
umask 077

readonly KEYS_DIR="${TICKETIV_KEYS_DIR:-$HOME/Ticketiv-Release-Keys}"
readonly KEYSTORE="$KEYS_DIR/ticketiv-upload.jks"
readonly ALIAS="ticketiv-upload"
readonly DNAME="CN=Ticketiv, OU=Mobile, O=Ticketiv, L=Mbabane, C=SZ"

readonly REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ARTIFACT="$REPO_ROOT/apps/ticketiv/.artifacts/ticketiv-play-release.aab"

rotate=0
[[ "${1:-}" == "--rotate-keystore" ]] && rotate=1
if [[ -n "${1:-}" && $rotate -eq 0 ]]; then
  echo "unknown argument: $1" >&2
  exit 2
fi

step() { printf '\n==> %s\n' "$1"; }
die()  { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

# Keep the signing material out of the working tree no matter how KEYS_DIR is set.
case "$(cd -- "$KEYS_DIR" 2>/dev/null && pwd || echo "$KEYS_DIR")" in
  "$REPO_ROOT"|"$REPO_ROOT"/*) die "keys directory must live outside the repository: $KEYS_DIR" ;;
esac

mkdir -p "$KEYS_DIR"
chmod 700 "$KEYS_DIR"

# ---------------------------------------------------------------- password ---
# Read from the terminal directly so the value cannot arrive from a pipe, a
# file, or the shell history.
[[ -r /dev/tty ]] || die "no terminal available; run this script directly in a local terminal"

step "Signing password"
echo "Type the Ticketiv upload signing password (input hidden)."
echo "The same value is used for both the keystore and the private key."
read -r -s -p "Password: " TICKETIV_UPLOAD_STORE_PASSWORD < /dev/tty; echo
read -r -s -p "Confirm:  " password_confirm < /dev/tty; echo

[[ "$TICKETIV_UPLOAD_STORE_PASSWORD" == "$password_confirm" ]] || die "passwords did not match"
(( ${#TICKETIV_UPLOAD_STORE_PASSWORD} >= 6 )) || die "keytool requires at least 6 characters"
unset password_confirm

# Requirement: one consistent secret for store and key. PKCS12 keystores cannot
# hold a distinct key password anyway -- keytool silently ignores a different
# -keypass, which is what produces "Cannot recover key" at signing time.
export TICKETIV_UPLOAD_STORE_PASSWORD
export TICKETIV_UPLOAD_KEY_PASSWORD="$TICKETIV_UPLOAD_STORE_PASSWORD"
export TICKETIV_UPLOAD_KEY_ALIAS="$ALIAS"
export TICKETIV_UPLOAD_STORE_FILE="$KEYSTORE"

# ---------------------------------------------------------------- keystore ---
if [[ $rotate -eq 1 && -f "$KEYSTORE" ]]; then
  backup="$KEYS_DIR/archive/ticketiv-upload.jks.$(date +%Y%m%d-%H%M%S).bak"
  step "Archiving the existing keystore (preserved, not deleted)"
  mkdir -p "$KEYS_DIR/archive"
  chmod 700 "$KEYS_DIR/archive"
  mv "$KEYSTORE" "$backup"
  chmod 400 "$backup"
  echo "archived -> $backup"
fi

if [[ ! -f "$KEYSTORE" ]]; then
  step "Generating a fresh upload keystore"
  keytool -genkeypair \
    -keystore "$KEYSTORE" -storetype PKCS12 \
    -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
    -dname "$DNAME" \
    -storepass:env TICKETIV_UPLOAD_STORE_PASSWORD \
    -keypass:env TICKETIV_UPLOAD_KEY_PASSWORD
  echo "created -> $KEYSTORE"
else
  step "Using the existing keystore"
  echo "$KEYSTORE"
fi
chmod 600 "$KEYSTORE"

# Fail in one second rather than after a multi-minute build.
step "Validating the alias and password before building"
keytool -list -keystore "$KEYSTORE" -alias "$ALIAS" \
  -storepass:env TICKETIV_UPLOAD_STORE_PASSWORD >/dev/null 2>&1 \
  || die "alias '$ALIAS' not readable with the supplied password. Re-run with --rotate-keystore to start clean."
echo "credentials OK"

# ------------------------------------------------------------------- build ---
step "Building the signed Play bundle"
rm -f "$ARTIFACT"
( cd "$REPO_ROOT" && pnpm --filter @ticketiv/app-consumer native:bundle:play )

[[ -f "$ARTIFACT" ]] || die "Gradle finished but produced no bundle at $ARTIFACT"

# ------------------------------------------------------------------ verify ---
# A release build with no signing environment still succeeds and still stages an
# unsigned bundle at this exact path, so BUILD SUCCESSFUL alone proves nothing.
step "Verifying the bundle signature"
export LC_ALL=C
verification_log="$(mktemp)"
trap 'rm -f "$verification_log"' EXIT

jarsigner -verify -verbose -certs "$ARTIFACT" > "$verification_log" 2>&1 || true
if ! grep -q '^jar verified\.$' "$verification_log"; then
  tail -20 "$verification_log" >&2
  die "jarsigner did not report the bundle as verified"
fi
echo "jarsigner: jar verified."

step "Verifying the signing certificate"
bundle_fp="$(keytool -printcert -jarfile "$ARTIFACT" | awk -F': ' '/SHA256:/{print $2; exit}')"
keystore_fp="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" \
  -storepass:env TICKETIV_UPLOAD_STORE_PASSWORD | awk -F': ' '/SHA256:/{print $2; exit}')"

[[ -n "$bundle_fp" ]] || die "could not read a certificate from the bundle"
[[ "$bundle_fp" == "$keystore_fp" ]] || die "bundle was signed by a different certificate than $KEYSTORE"

cat <<SUMMARY

------------------------------------------------------------------
Signed Play bundle verified.

  Artifact : $ARTIFACT
  Keystore : $KEYSTORE
  Alias    : $ALIAS
  SHA-256  : $bundle_fp

That SHA-256 is the *upload* certificate. It is not the Play App
Signing certificate, so do not use it for assetlinks.json.
------------------------------------------------------------------
SUMMARY
