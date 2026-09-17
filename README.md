# Cloud Dial for SoundCloud

An unofficial Windows Stream Deck dial plugin for the **SoundCloud desktop app**.

- Live cover artwork, track title, artist and playback state on the dial display.
- Turn the dial to change **only SoundCloud's Windows app volume**.
- Press the dial to play or pause. Touching the display also toggles playback on touch-capable devices.
- Configurable 1%, 2%, 3%, 5% or 10% volume steps. Default: 2% per tick.
- No SoundCloud API key, subscription, browser extension or OBS required.

## Install

1. Download the `.streamDeckPlugin` file from [Releases](https://github.com/Adamperri/soundcloud-dial/releases/latest).
2. Double-click it and accept Stream Deck's plugin installation prompt.
3. In Stream Deck, select **Dials**, expand **Cloud Dial for SoundCloud**, and drag **SoundCloud Dial** onto a dial slot.
4. Open the SoundCloud Windows desktop app and play a track. Artwork and controls connect automatically.

Installation adds a plugin, not a profile. Your existing keys, soundboard and other dials are not replaced.

## Requirements

- Windows 11 x64 (the Windows APIs also support Windows 10 20H1+, not hardware-tested here).
- Stream Deck 7.5 or newer.
- A dial-capable device: Corsair GALLEON 100 SD or Stream Deck + / + XL. The implementation uses the standard 200 x 100 encoder layout; only the GALLEON is available for local hardware validation.
- SoundCloud's Microsoft Store desktop app (`SoundcloudLtd.SoundCloud-MusicAudio`).

**Browser tabs, browser-installed PWAs, macOS, Windows ARM64 and third-party SoundCloud clients are not supported by this release.** The plugin intentionally will not control another app when SoundCloud is absent.

The Windows helper includes its .NET runtime. Users do not need Node.js or .NET installed separately; Stream Deck provides its Node runtime.

## Behavior and Troubleshooting

- Artwork and metadata normally update within one second. Tracks without artwork use the disc icon.
- `Open SoundCloud` means the desktop app has not published a Windows media session. Start a track once.
- `--` volume means SoundCloud has not opened an audio session yet. Start playback to activate volume control.
- Volume is the Windows per-app mixer level, not SoundCloud's in-app player slider. If the in-app slider is zero, turning the dial cannot override it.
- A positive volume turn also unmutes the SoundCloud Windows session. It never changes master volume, output devices, microphone levels, or other applications.
- The orange bar shows volume, not track progress. The playback symbol reflects the current playback state.
- Long titles are ellipsized to fit the display. The plugin does not scroll text across neighboring dials.
- The bridge reconnects after SoundCloud or an audio device restarts. Switch away from the profile and back if necessary.
- The plugin only reads Windows media metadata and changes local playback/volume. It does not download songs or redistribute cover art.

## Build

Install Node.js 22+, npm and a current .NET 8+ SDK on Windows, then:

```powershell
npm ci
npm run check
npm test
npm run build
npm run validate
npm run pack
```

The installer is written to `dist/`. Native runtime version is pinned in the `.csproj` and should be updated for security releases. The native helper is self-contained `win-x64`; it is intentionally not trimmed because it uses WinRT and COM.

Optional **live integration test** (briefly changes SoundCloud volume and pauses/resumes the currently loaded track, restoring both afterwards):

```powershell
node scripts/test-live.mjs --controls
```

This drives the real plugin through a local Stream Deck WebSocket test harness, including dial events, rather than calling only a mocked control function. A current cover image may be written to the git-ignored `local/` directory during this opt-in test. Do not publish that directory.

## Architecture

The official Elgato TypeScript SDK handles dial events and feedback. A local C# helper reads `GlobalSystemMediaTransportControlsSessionManager` and uses NAudio/Core Audio for application volume across render endpoints. Both media and audio sessions are restricted to the SoundCloud Store package identity. Communication uses private child-process stdin/stdout; the plugin opens no network listener and calls no cloud service. The test harness alone opens an ephemeral loopback server.

## Distribution

GitHub Releases are the direct-install distribution. An Elgato Marketplace listing requires separate Maker Console submission and approval; a GitHub release is **not** a Marketplace approval. Submission details are in `docs/MARKETPLACE.md`.

## License and Attribution

Plugin source: MIT. See `THIRD_PARTY_NOTICES.md` and the installer notices for dependency licenses. Cover artwork remains the property of its owners and is not included in this repository or installer.

SoundCloud, Stream Deck, Elgato and Corsair are trademarks of their respective owners. This independent plugin is not affiliated with or endorsed by those companies.

[Privacy](PRIVACY.md) | [Issues](https://github.com/Adamperri/soundcloud-dial/issues)
