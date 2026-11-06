#!/usr/bin/env bash
# Builds and signs the Android app, then keeps only the newest APK in the key folder.
# Raise versionCode and versionName in app/build.gradle (and twa-manifest.json) first.
#
#   bash android/build-apk.sh
#
# Needs: JDK 17 (Gradle 8.11 rejects newer Java), the Android SDK, and the signing key
# folder, which is never in the repo.
set -euo pipefail

KEY_DIR="${KEY_DIR:-/c/Users/lenovo/electrosoft-android-key}"
export JAVA_HOME="${JAVA_HOME_17:-C:/Users/lenovo/.jdks/jdk-17}"
BUILD_TOOLS="${BUILD_TOOLS:-$LOCALAPPDATA/Android/Sdk/build-tools/36.0.0}"

cd "$(dirname "$0")"
version=$(sed -n 's/^ *versionName "\(.*\)"/\1/p' app/build.gradle)
apk="Electrosoft-v$version.apk"
password=$(sed -n 's/^Password (store and key): //p' "$KEY_DIR/PASSWORD.txt")

./gradlew assembleRelease --no-daemon -q
"$BUILD_TOOLS/zipalign.exe" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app-aligned.apk
PATH="$(cygpath -u "$JAVA_HOME")/bin:$PATH" "$BUILD_TOOLS/apksigner.bat" sign \
  --ks "$KEY_DIR/electrosoft.keystore" --ks-key-alias electrosoft \
  --ks-pass "pass:$password" --key-pass "pass:$password" \
  --out "$KEY_DIR/$apk" app-aligned.apk
rm app-aligned.apk

# Only the newest APK is kept, so nobody sends an old one by mistake.
find "$KEY_DIR" -maxdepth 1 \( -name 'Electrosoft*.apk' ! -name "$apk" -o -name '*.idsig' \) -delete
echo "Built $KEY_DIR/$apk"
