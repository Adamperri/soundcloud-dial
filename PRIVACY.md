# Privacy

Cloud Dial for SoundCloud processes the current SoundCloud track title, artist,
cover thumbnail and playback state locally using Windows media session APIs.
It reads SoundCloud's Windows audio-session level and changes that level only
when a dial is turned. Playback commands are sent only to SoundCloud.

The plugin does not collect analytics, credentials, tokens, listening history,
microphone audio or account information. It makes no Internet requests and
runs no HTTP server. Its only socket connection is to Stream Deck's local API.
It does not change audio routing or microphone configuration.

Current metadata/artwork is held in memory and sent to Stream Deck for display.
The plugin does not intentionally log media metadata. Stream Deck may retain
its own logs or display caches under its own privacy policy. Do not enable
trace-level SDK logging if you do not want feedback payloads logged locally.

The optional developer live test saves a current thumbnail in a git-ignored
local directory; this is not part of the installed plugin's behavior.

This policy covers the plugin, not SoundCloud, Microsoft Windows, Elgato
Stream Deck or the website from which you download it.
