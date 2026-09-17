using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using NAudio.CoreAudioApi;
using NAudio.CoreAudioApi.Interfaces;

namespace CloudDial.Bridge;

internal sealed class AppVolume
{
    public const string PackageFamily = "SoundcloudLtd.SoundCloud-MusicAudio_2xc63xn306dnw";

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetPackageFamilyName(IntPtr process, ref uint length, StringBuilder? name);

    private static HashSet<uint> FindProcesses()
    {
        var ids = new HashSet<uint>();
        foreach (var process in Process.GetProcessesByName("soundcouch"))
        {
            using (process)
            {
                try
                {
                    uint length = 0;
                    GetPackageFamilyName(process.Handle, ref length, null);
                    if (length == 0 || length > 1024) continue;
                    var name = new StringBuilder((int)length);
                    if (GetPackageFamilyName(process.Handle, ref length, name) == 0 && name.ToString().Equals(PackageFamily, StringComparison.OrdinalIgnoreCase))
                        ids.Add((uint)process.Id);
                }
                catch { /* App may close between enumeration and querying its identity. */ }
            }
        }
        return ids;
    }

    private static void Visit(Action<AudioSessionControl> action)
    {
        var ids = FindProcesses();
        if (ids.Count == 0) return;
        using var enumerator = new MMDeviceEnumerator();
        foreach (var device in enumerator.EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active))
        {
            using (device)
            {
                try
                {
                    var sessions = device.AudioSessionManager.Sessions;
                    for (var i = 0; i < sessions.Count; i++)
                    {
                        using var session = sessions[i];
                        if (ids.Contains(session.GetProcessID) && session.State != AudioSessionState.AudioSessionStateExpired)
                            action(session);
                    }
                }
                catch (COMException) { /* Audio endpoint can disappear when a headset is unplugged. */ }
            }
        }
    }

    public (int? Level, bool Muted) Read()
    {
        var samples = new List<(bool Active, float Level, bool Muted)>();
        Visit(s => samples.Add((s.State == AudioSessionState.AudioSessionStateActive, s.SimpleAudioVolume.Volume, s.SimpleAudioVolume.Mute)));
        if (samples.Count == 0) return (null, false);
        var sample = samples.OrderByDescending(s => s.Active).ThenByDescending(s => s.Level).First();
        return ((int)Math.Round(sample.Level * 100, MidpointRounding.AwayFromZero), sample.Muted);
    }

    public void Change(int delta)
    {
        var current = Read();
        if (current.Level == null) throw new UserError("Start a SoundCloud track to activate its volume control.");
        if (delta == 0) return;
        var target = Math.Clamp(current.Level.Value + delta, 0, 100) / 100f;
        var changed = false;
        Visit(s =>
        {
            s.SimpleAudioVolume.Volume = target;
            if (delta > 0) s.SimpleAudioVolume.Mute = false;
            changed = true;
        });
        if (!changed) throw new UserError("SoundCloud audio session closed. Try again.");
    }
}
