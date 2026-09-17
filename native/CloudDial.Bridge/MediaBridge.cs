using Windows.Media.Control;
using Windows.Graphics.Imaging;
using Windows.Storage.Streams;

namespace CloudDial.Bridge;

internal sealed class UserError(string message) : Exception(message);

internal sealed record MediaState(bool Connected, string Title, string Artist, string Playback,
    bool CanToggle, int? Volume, bool Muted, string? Artwork);

internal sealed class MediaBridge : IDisposable
{
    private GlobalSystemMediaTransportControlsSessionManager? manager;
    private GlobalSystemMediaTransportControlsSession? session;
    private readonly AppVolume volume = new();
    private int mediaDirty = 1;
    private string title = "";
    private string artist = "";
    private string? artwork;
    private DateTime lastMediaRead = DateTime.MinValue;

    private async Task<GlobalSystemMediaTransportControlsSession?> FindSession()
    {
        manager ??= await GlobalSystemMediaTransportControlsSessionManager.RequestAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        var sessions = manager.GetSessions().Where(s => s.SourceAppUserModelId.StartsWith(AppVolume.PackageFamily + "!", StringComparison.OrdinalIgnoreCase));
        var next = sessions.OrderByDescending(s => s.GetPlaybackInfo().PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing).FirstOrDefault();
        if (!Equals(next, session))
        {
            if (session != null) session.MediaPropertiesChanged -= OnMediaChanged;
            session = next;
            if (session != null) session.MediaPropertiesChanged += OnMediaChanged;
            title = artist = "";
            artwork = null;
            Interlocked.Exchange(ref mediaDirty, 1);
        }
        return session;
    }

    private void OnMediaChanged(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs args) => Interlocked.Exchange(ref mediaDirty, 1);

    public async Task<MediaState> Snapshot()
    {
        var current = await FindSession();
        var levels = volume.Read();
        if (current == null) return new(false, "Open SoundCloud", "Desktop app", "Stopped", false, levels.Level, levels.Muted, null);
        if (Interlocked.Exchange(ref mediaDirty, 0) != 0 || DateTime.UtcNow - lastMediaRead > TimeSpan.FromSeconds(20))
        {
            try
            {
                var media = await current.TryGetMediaPropertiesAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5));
                title = media.Title;
                artist = media.Artist;
                artwork = await ReadArtwork(media.Thumbnail);
                lastMediaRead = DateTime.UtcNow;
            }
            catch
            {
                Interlocked.Exchange(ref mediaDirty, 1);
                throw;
            }
        }
        var playback = current.GetPlaybackInfo();
        return new(true, title, artist, playback.PlaybackStatus.ToString(),
            playback.Controls.IsPlayPauseToggleEnabled || playback.Controls.IsPlayEnabled || playback.Controls.IsPauseEnabled,
            levels.Level, levels.Muted, artwork);
    }

    private static async Task<string?> ReadArtwork(IRandomAccessStreamReference? thumbnail)
    {
        if (thumbnail == null) return null;
        try
        {
            using var source = await thumbnail.OpenReadAsync();
            if (source.Size > 16 * 1024 * 1024) return null;
            var decoder = await BitmapDecoder.CreateAsync(source);
            if (decoder.PixelWidth == 0 || decoder.PixelHeight == 0 || (ulong)decoder.PixelWidth * decoder.PixelHeight > 40_000_000) return null;
            var scale = 144.0 / Math.Max(decoder.PixelWidth, decoder.PixelHeight);
            var transform = new BitmapTransform { ScaledWidth = Math.Max(1, (uint)(decoder.PixelWidth * scale)), ScaledHeight = Math.Max(1, (uint)(decoder.PixelHeight * scale)), InterpolationMode = BitmapInterpolationMode.Fant };
            using var bitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, transform, ExifOrientationMode.RespectExifOrientation, ColorManagementMode.ColorManageToSRgb);
            using var target = new InMemoryRandomAccessStream();
            var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, target);
            encoder.SetSoftwareBitmap(bitmap);
            await encoder.FlushAsync();
            target.Seek(0);
            using var reader = new DataReader(target);
            await reader.LoadAsync((uint)target.Size);
            var bytes = new byte[(int)target.Size];
            reader.ReadBytes(bytes);
            return "data:image/png;base64," + Convert.ToBase64String(bytes);
        }
        catch { return null; }
    }

    public async Task Toggle()
    {
        var current = await FindSession() ?? throw new UserError("Open SoundCloud and choose a track first.");
        var playback = current.GetPlaybackInfo();
        bool success;
        if (playback.Controls.IsPlayPauseToggleEnabled)
            success = await current.TryTogglePlayPauseAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        else if (playback.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing && playback.Controls.IsPauseEnabled)
            success = await current.TryPauseAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        else if (playback.Controls.IsPlayEnabled)
            success = await current.TryPlayAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        else success = false;
        if (!success) throw new UserError("SoundCloud did not accept the playback command.");
    }

    public void ChangeVolume(int delta)
    {
        if (delta is < -100 or > 100) throw new ArgumentException("Volume change must be between -100 and 100.");
        volume.Change(delta);
    }

    public void Dispose()
    {
        if (session != null) session.MediaPropertiesChanged -= OnMediaChanged;
    }
}
