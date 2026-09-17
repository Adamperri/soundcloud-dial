# Cloud Dial for SoundCloud 1.0.0

An unofficial Windows dial plugin for SoundCloud's Microsoft Store desktop app.

- Current song artwork, title, artist and playback state on the dial display.
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

Validation includes TypeScript checks, unit/layout tests, official Stream Deck
package validation, and an end-to-end plugin WebSocket test against the real
SoundCloud Windows app for live artwork, volume and play/pause.

This is a direct GitHub release, not an approved Elgato Marketplace listing.
See the repository for source, MIT license, privacy details and support.

SoundCloud, Elgato and Corsair do not sponsor or endorse this plugin.
