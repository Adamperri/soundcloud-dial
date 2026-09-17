using CloudDial.Bridge;
using System.Drawing;

static void Check(bool value, string name) { if (!value) throw new Exception(name); Console.WriteLine("PASS: " + name); }
Check(AppProgress.TryTime("2:35", out var time) && time == 155, "minute timestamp");
Check(AppProgress.TryTime("1:02:03", out time) && time == 3723, "hour timestamp");
Check(!AppProgress.TryTime("3:72", out _) && !AppProgress.TryTime("track 3:12", out _), "reject malformed timestamps");
TimeLabel[] labels = [new(72, 80, 500, 120, 520), new(220, 640, 500, 680, 520)];
Check(AppProgress.Match(labels) == (72d, 220d), "pair displayed elapsed and total");
Check(AppProgress.Match([labels[0], labels[1] with { Top = 550, Bottom = 570 }]) == null, "do not pair unrelated rows");
Check(AppProgress.Match([labels[0], labels[1], labels[1] with { Left = 740, Right = 780 }]) == null, "reject ambiguous timing labels");
Check(AppProgress.Match([labels[0] with { Seconds = 240 }, labels[1]]) == null, "reject elapsed greater than duration");
Check(AppProgress.Match([labels[0] with { Top = 0, Bottom = 0 }, labels[1] with { Top = 0, Bottom = 0 }]) == null, "reject collapsed stale layout");
var raster = TitleRaster.Render("A long title that must keep its complete ending instead of ellipses");
Check(raster != null, "Windows title rendering");
using var stream = new MemoryStream(Convert.FromBase64String(raster![22..]));
using var bitmap = new Bitmap(stream);
Check(bitmap.Width > 192 && bitmap.Width <= 8192 && bitmap.Height == 48, "bounded, full-width title raster");
using var measure = Graphics.FromImage(bitmap);
using var levelFont = new Font("Segoe UI", 16, FontStyle.Bold, GraphicsUnit.Pixel);
Check(measure.MeasureString("100%", levelFont, 100, StringFormat.GenericTypographic).Width <= 43, "maximum volume label fits its layout");
