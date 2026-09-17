/* Stream Deck calls this function when the property inspector opens. */
function connectElgatoStreamDeckSocket(port, uuid, registerEvent, info, actionInfo) {
  const action = JSON.parse(actionInfo);
  let settings = action.payload.settings || {};
  const input = document.getElementById("step");
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  const render = () => { input.value = String(settings.volumeStep || 2); };
  render();
  socket.onopen = () => {
    socket.send(JSON.stringify({ event: registerEvent, uuid }));
    input.disabled = false;
  };
  socket.onclose = () => { input.disabled = true; };
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.event === "didReceiveSettings") { settings = message.payload.settings || {}; render(); }
  };
  input.onchange = () => {
    settings = { ...settings, volumeStep: Number(input.value) };
    socket.send(JSON.stringify({ event: "setSettings", context: action.context, payload: settings }));
  };
}
