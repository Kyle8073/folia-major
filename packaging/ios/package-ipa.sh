#!/bin/bash
set -euo pipefail
# A device build must exist; refuse to package a simulator binary or an empty placeholder.
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="${1:-$ROOT_DIR/ios/DerivedData/Build/Products/Release-iphoneos/App.app}"
OUTPUT_DIR="$ROOT_DIR/ios/output"
if [[ ! -x "$APP_PATH/App" ]]; then
    echo 'A compiled iOS device app is required.' >&2
    exit 1
fi
xcrun lipo -verify_arch arm64 "$APP_PATH/App"
mkdir -p "$OUTPUT_DIR"
STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT
mkdir -p "$STAGE_DIR/Payload"
ditto "$APP_PATH" "$STAGE_DIR/Payload/Folia.app"
SIGNED_APP="$STAGE_DIR/Payload/Folia.app"
# Sign nested native libraries first. TrollStore supplies installation trust; no private entitlements are added.
if [[ -d "$SIGNED_APP/Frameworks" ]]; then
    while IFS= read -r -d '' ITEM; do
        codesign --force --sign - --timestamp=none "$ITEM"
    done < <(find "$SIGNED_APP/Frameworks" -depth \( -name '*.framework' -o -name '*.dylib' \) -print0)
fi
codesign --force --sign - --timestamp=none "$SIGNED_APP"
codesign --verify --deep --strict "$SIGNED_APP"
ditto -c -k --keepParent "$STAGE_DIR/Payload" "$OUTPUT_DIR/Folia-iOS-TrollStore.ipa"
shasum -a 256 "$OUTPUT_DIR/Folia-iOS-TrollStore.ipa" > "$OUTPUT_DIR/Folia-iOS-TrollStore.ipa.sha256"
echo "$OUTPUT_DIR/Folia-iOS-TrollStore.ipa"
