namespace CloudDial.Bridge;

internal sealed class UserError(string message) : Exception(message);
