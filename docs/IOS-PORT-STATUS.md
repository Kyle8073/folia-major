# Folia iOS port — development status

Upstream: chthollyphile/folia-major @ 565dce89c623c5e6af68ab5916229b196b9d2676 (0.7.25).
Target: iPhone arm64, minimum iOS 16.0, TrollStore. Unofficial development build.

## Implemented in this patch

- Bundled upstream frontend (not a remote website URL), original lyric styles and provider source retained.
- Capacitor 6.2.1 iOS host, all normal iPhone orientations, iPad rotations, system/manual native theme synchronization.
- Playback AVAudioSession and audio background declaration; actual lock-screen/background reliability still needs a physical iPhone.
- Local folder picker, a persistent private copy of selected music, serialized native directory descriptors, validated native paths, stat-only audio scanning and bounded reads.
- Removal of native copies when imported roots or app data are removed.
- Runtime settings under Settings → Connections and integrations → Music backends. Saved locally, app reloads on save.
- Runtime-compatible NetEase/QQ/KuGou transport base URLs.
- Spotify, YouTube Music, Bodian and Qishui operation transports for a compatible remote gateway; original provider mapping/catalog logic retained.
- Safari 16 JS build target + core-js compatibility; basic source typecheck and transport tests.
- macOS Actions workflow to compile the native app, ad-hoc sign and package an IPA without private entitlements.

## Exact gateway requirement

NetEase/QQ/KuGou entries accept the existing compatible API base paths used by upstream Folia. Navidrome continues to use the original Navidrome settings.

**Spotify/YouTube Music/Bodian/Qishui fields are NOT arbitrary public music REST API base URLs.** Each is a POST operation gateway endpoint:

Request: `{"operation":"audio","params":{"id":"..."}}` (other operations/params are defined by the matching `src/services/onlineMusic/<provider>/<provider>Transport.ts`).

Response: `{"ok":true,"data":...}` or `{"ok":false,"error":{"code":"auth-required","message":"..."}}`, preserving upstream provider data shapes. Authentication uses each server's cookies; server must isolate sessions by client. The app has no preconfigured server or credentials.

The desktop source has no such remote HTTP gateway for these four providers. Merely having a compatible NetEase/QQ/KuGou backend DOES NOT establish Spotify compatibility. A matching gateway or adapter must be supplied/implemented after the actual backend contract is known. Full-track Spotify audio is not provided by a generic Spotify metadata API and is not assumed here. All returned playback URLs must be reachable from the phone and support its audio codecs, byte ranges and, for Web Audio analysis, the necessary origin policy. Desktop-only `folia-spotify:`/`folia-ytm:` URLs are not phone URLs. Account login must operate on the phone or via an explicit supported authorization URL, not try to launch a browser on a headless server.

## Not completed or validated

This is a native foundation, **not a fully migrated all-features release**. It does not claim the following:

- End-to-end login/search/playlist/audio validation against actual user backends (addresses/contracts/accounts not supplied).
- Replacement of the Electron Node mod execution host, desktop wallpaper/windows/OBS helpers, desktop HiFi/FFmpeg engines, on-device MNN/AI engines, native Apple Music/FnMusic bridges.
- Feature equivalence for desktop-only system integrations. Keeping their source files does not implement them on iOS.
- All advanced visualizer WebGPU/OffscreenCanvas paths on iOS 16.1. Monet now has a native iOS main-thread Canvas fallback, but visual correctness and other advanced paths still need device tests.
- Device install, long-running/background audio, Bluetooth/AirPlay, memory limits, all lyric/visualizer styles, phone rotation, network login and streaming codecs.

Do not describe the patch as “all functions working” until those items have been implemented and verified. Typecheck/unit tests/web build are not evidence of an iPhone native build or actual Spotify playback.

## Build

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run test:unit -- test/unit/ios
npm run build:ios:web
npm run prepare:ios
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath ios/DerivedData ARCHS=arm64 CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
npm run package:ios
```

The last three steps require macOS/Xcode/CocoaPods. Workflow: `.github/workflows/ios-trollstore.yml`; output: `ios/output/Folia-iOS-TrollStore.ipa`. Installation trust must be checked with TrollStore on the target phone.

## Checkpoint validation

2026-11-05: local TypeScript check passed; 191 focused unit tests passed; production iOS web bundle built. Two independent source-review rounds completed and confirmed findings fixed. Second-round corrections were not sent through a third review. Real iPhone and backend testing remain outstanding. GitHub Actions enabled by the repository owner. Native build 41977837664 succeeded, including ad-hoc signature verification and IPA artifact upload (code commit b248ea3ff25f6986ac1ef264af9bfba1c711db46).
