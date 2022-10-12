type EventHandler = (data: any) => void;
type LogHandler = (msg: string) => void;

/**
 * Client-side WebSocket event manager.
 */
class WebSocketClient {
  private events: { [event: string]: EventHandler };
  private ws: WebSocket;
  private preOpenMessages: Array<string>;
  private onLog: LogHandler | undefined;

  constructor(url: string, onOpen?: () => void) {
    this.events = {};
    this.ws = new WebSocket(url);
    this.preOpenMessages = [];

    this.ws.onopen = () => {
      if (this.onLog) this.onLog(`WebSocket connection opened at ${url}`);
      if (onOpen) onOpen();

      let msg: string | undefined = this.preOpenMessages.shift();
      while (msg) {
        this.ws.send(msg);
        msg = this.preOpenMessages.shift();
      }
    };

    this.ws.onmessage = (message) => {
      let parsed: any;
      try {
        parsed = JSON.parse(message.data);
      } catch {
        if (this.onLog) this.onLog(`Non-JSON message received: ${message.data}`);
        return;
      }
      if (!parsed.event) {
        if (this.onLog) this.onLog(`Invalid message received: ${parsed}`);
        return;
      }
      if (this.onLog) this.onLog(`Event ${parsed.event} received: ${JSON.stringify(parsed.data)}`);
      if (this.events[parsed.event]) this.events[parsed.event](parsed.data);
    };
  }

  addEventHandler(event: string, callback: EventHandler) {
    this.events[event] = callback;
  }

  sendMessage(event: string, data: any) {
    const msg = JSON.stringify({ event, data });
    if (this.onLog) this.onLog(`Sending: ${msg}`);
    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.preOpenMessages.push(msg);
    } else {
      this.ws.send(msg);
    }
  }

  removeEventHandler(event: string) {
    delete this.events[event];
  }

  /**
   * Sets a handler for logs emitted by this instance.
   * Currently logs are just strings; there is no metadata provided or way to filter types of logs.
   */
  setLogger(handler: LogHandler) {
    this.onLog = handler;
  }
}

export default WebSocketClient;
