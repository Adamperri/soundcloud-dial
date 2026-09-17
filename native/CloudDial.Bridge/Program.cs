using System.Text;
using System.Text.Json;
using CloudDial.Bridge;

Console.InputEncoding = new UTF8Encoding(false);
Console.OutputEncoding = new UTF8Encoding(false);
var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
using var bridge = new MediaBridge();

if (args.Contains("--probe"))
{
    var state = await bridge.Snapshot();
    Console.WriteLine(JsonSerializer.Serialize(state with { Artwork = state.Artwork == null ? null : "available" }, options));
    return;
}

string? line;
while ((line = await Console.In.ReadLineAsync()) != null)
{
    string? id = null;
    try
    {
        if (line.Length > 4096) throw new ArgumentException("Request too large.");
        var request = JsonSerializer.Deserialize<Request>(line, options) ?? throw new ArgumentException("Invalid request.");
        id = request.Id;
        switch (request.Command)
        {
            case "snapshot": break;
            case "toggle": await bridge.Toggle(); break;
            case "volume": bridge.ChangeVolume(request.Delta); break;
            default: throw new ArgumentException("Unknown command.");
        }
        var state = await bridge.Snapshot();
        Console.WriteLine(JsonSerializer.Serialize(new { id, ok = true, state }, options));
    }
    catch (Exception ex)
    {
        // Do not send exception traces, process paths, or media details to plugin logs.
        Console.WriteLine(JsonSerializer.Serialize(new { id, ok = false, error = ex is UserError or ArgumentException ? ex.Message : "Windows media service is unavailable. Try again." }, options));
    }
}

record Request(string Id, string Command, int Delta = 0);
