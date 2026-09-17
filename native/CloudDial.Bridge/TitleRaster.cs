using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Text;

namespace CloudDial.Bridge;

internal static class TitleRaster
{
    public static string? Render(string title)
    {
        try
        {
            // Shape the whole title with Windows font fallback, then scroll its pixels.
            // This preserves proportional spacing, Unicode and joined character shapes.
            var text = string.Concat(title.EnumerateRunes().Take(160).Select(r => Rune.IsControl(r) ? " " : r.ToString()));
            if (string.IsNullOrWhiteSpace(text)) text = "SoundCloud";
            using var font = new Font("Segoe UI", 28, FontStyle.Bold, GraphicsUnit.Pixel);
            using var format = (StringFormat)StringFormat.GenericTypographic.Clone();
            format.FormatFlags |= StringFormatFlags.NoWrap | StringFormatFlags.MeasureTrailingSpaces;
            using var measuring = new Bitmap(1, 1);
            using var measure = Graphics.FromImage(measuring);
            var width = Math.Clamp((int)Math.Ceiling(measure.MeasureString(text, font, 8192, format).Width) + 6, 1, 8192);
            using var bitmap = new Bitmap(width, 48, PixelFormat.Format32bppArgb);
            using var graphics = Graphics.FromImage(bitmap);
            graphics.Clear(Color.FromArgb(17, 18, 20));
            graphics.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            graphics.DrawString(text, font, Brushes.White, new PointF(2, (48 - font.GetHeight(graphics)) / 2), format);
            using var stream = new MemoryStream();
            bitmap.Save(stream, ImageFormat.Png);
            return "data:image/png;base64," + Convert.ToBase64String(stream.ToArray());
        }
        catch { return null; }
    }
}
