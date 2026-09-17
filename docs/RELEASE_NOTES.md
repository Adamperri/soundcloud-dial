# Cloud Dial for SoundCloud 1.1.0

An unofficial Windows dial plugin for SoundCloud's Microsoft Store desktop app.

- Larger 88 x 88 song artwork (previously 70 x 70).
- Smooth, continuous wrapping for long song titles instead of ellipses; short titles stay still.
- Real song progress between the playback icon and volume percentage, including while SoundCloud is minimized.
- Turn for SoundCloud-only app volume. Press for play/pause.
- Adjustable volume increments and automatic reconnection.
- No API keys, subscriptions, browser extensions or OBS required.

## Installation

Download `com.adamperri.soundclouddial.streamDeckPlugin`, double-click it, and
accept the Stream Deck installation prompt. Add **Cloud Dial for SoundCloud >
SoundCloud Dial** to a dial slot. Open SoundCloud and start a track.

Requires Windows x64, Stream Deck 7.5+ and a dial-capable device. Browser tabs,
browser PWAs, macOS and Windows ARM64 are not supported. Installation does not
replace your profile or soundboard keys. The native Windows helper and its
.NET runtime are included; the native binary is not code-signed.

Progress uses Windows media timing when supplied, otherwise read-only access
to SoundCloud's displayed elapsed/total time labels. No clicking, screenshots
or screen recording. If an app view does not expose an unambiguous current
track timeline, the bar hides instead of guessing. SoundCloud UI changes may
affect this fallback.

Validation includes TypeScript checks, unit/layout tests, Windows-native
timing-parser tests, official Stream Deck package validation, and an end-to-end
plugin WebSocket test against the real SoundCloud app for artwork, scrolling,
progress, volume and play/pause.

This is a direct GitHub release, not an approved Elgato Marketplace listing.
See the repository for source, MIT license, privacy details and support.

SoundCloud, Elgato and Corsair do not sponsor or endorse this plugin.
