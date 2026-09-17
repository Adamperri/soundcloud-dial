using System.Globalization;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using Interop.UIAutomationClient;

namespace CloudDial.Bridge;

internal sealed class AppProgress : IDisposable
{
    private CUIAutomation8? automation;

    public (double Position, double Duration)? Read(string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        IUIAutomationElement? desktop = null;
        IUIAutomationElement? window = null;
        IUIAutomationElementArray? nodes = null;
        IUIAutomationCondition? windowCondition = null;
        IUIAutomationCondition? textCondition = null;
        IUIAutomationCacheRequest? cache = null;
        try
        {
            var processes = AppVolume.FindProcesses();
            if (processes.Count == 0) return null;
            automation ??= new CUIAutomation8 { ConnectionTimeout = 800, TransactionTimeout = 800 };
            foreach (var id in processes)
            {
                using var process = Process.GetProcessById((int)id);
                if (process.MainWindowHandle != IntPtr.Zero)
                {
                    window = automation.ElementFromHandle(process.MainWindowHandle);
                    break;
                }
            }
            // UWP re-parents its CoreWindow when minimized; otherwise use its host window.
            if (window == null)
            {
                desktop = automation.GetRootElement();
                windowCondition = automation.CreatePropertyCondition(UIA_PropertyIds.UIA_NamePropertyId, "SoundCloud - Music & Audio");
                window = desktop.FindFirst(TreeScope.TreeScope_Children, windowCondition);
            }
            if (window == null) return null;
            textCondition = automation.CreatePropertyCondition(UIA_PropertyIds.UIA_ControlTypePropertyId, UIA_ControlTypeIds.UIA_TextControlTypeId);
            cache = automation.CreateCacheRequest();
            cache.AddProperty(UIA_PropertyIds.UIA_NamePropertyId);
            cache.AddProperty(UIA_PropertyIds.UIA_ProcessIdPropertyId);
            cache.AddProperty(UIA_PropertyIds.UIA_BoundingRectanglePropertyId);
            nodes = window.FindAllBuildCache(TreeScope.TreeScope_Descendants, textCondition, cache);
            if (nodes.Length > 1500) return null;
            var times = new List<TimeLabel>();
            var titleMatches = false;
            for (var i = 0; i < nodes.Length; i++)
            {
                var node = nodes.GetElement(i);
                try
                {
                    if (!processes.Contains((uint)node.CachedProcessId)) continue;
                    var name = node.CachedName ?? "";
                    if (name.Equals(title, StringComparison.Ordinal)) titleMatches = true;
                    if (!TryTime(name, out var seconds)) continue;
                    var rect = node.CachedBoundingRectangle;
                    times.Add(new(seconds, rect.left, rect.top, rect.right, rect.bottom));
                }
                finally { Release(node); }
            }
            // Only accept one unambiguous, horizontally paired timeline for this track.
            // No clicks, screenshots, other apps, or estimated progress are used.
            return titleMatches && times.Count == 2 ? Match(times) : null;
        }
        catch { return null; }
        finally
        {
            Release(nodes); Release(cache); Release(textCondition); Release(windowCondition);
            Release(window); Release(desktop);
        }
    }

    internal static bool TryTime(string value, out double seconds)
    {
        seconds = 0;
        if (!Regex.IsMatch(value, @"^\d{1,3}:[0-5]\d(?::[0-5]\d)?$", RegexOptions.CultureInvariant)) return false;
        foreach (var part in value.Split(':')) seconds = seconds * 60 + int.Parse(part, CultureInfo.InvariantCulture);
        return true;
    }

    internal static (double Position, double Duration)? Match(IReadOnlyList<TimeLabel> labels)
    {
        var pairs = new List<(double Position, double Duration)>();
        foreach (var left in labels)
        foreach (var right in labels)
        {
            if (left == right || right.Left - left.Right < 40 || Math.Abs(left.Top - right.Top) > 6 ||
                left.Bottom <= left.Top || right.Bottom <= right.Top || left.Seconds > right.Seconds || right.Seconds <= 0) continue;
            pairs.Add((left.Seconds, right.Seconds));
        }
        return pairs.Count == 1 ? pairs[0] : null;
    }

    private static void Release(object? value)
    {
        if (value != null && Marshal.IsComObject(value)) Marshal.ReleaseComObject(value);
    }

    public void Dispose() { Release(automation); automation = null; }
}

internal sealed record TimeLabel(double Seconds, int Left, int Top, int Right, int Bottom);
