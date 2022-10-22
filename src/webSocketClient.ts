type EventHandler = (data: any) => void;
type LogHandler = (msg: string) => void;

/**
 * A WebSocket client.
 * Sends messages and expected to receive messages in the following format:
 * ```json
 * {
 *   "event": "eventName",
 *   "data": "string, object, array, number, etc."
 * }
 * ```
 */
class WebSocketClient {
  private events: { [event: string]: EventHandler };
  private ws: WebSocket;
  /**
   * Tracks messages attempted to be sent before the WS connection has been opened.
   * Messages are sent once the connection succeeds.
   */
  private preOpenMessages: Array<string>;
  private onLog: LogHandler | undefined;

  static withUrl(url: string, onOpen?: () => void) {
    return new this(new WebSocket(url), onOpen);
  }

  /**
   * Uses the given WebSocket to handle sending and receiving message.
   * Messages sent before the connection has opened will be buffered and sent once it has opened.
   * @param onOpen An optional callback invoked once the connection is opened
   */
  constructor(webSocket: WebSocket, onOpen?: () => void) {
    this.events = {};
    this.ws = webSocket;
    this.preOpenMessages = [];

    this.ws.onopen = () => {
      if (this.onLog) this.onLog(`WebSocket connection opened at ${this.ws.url}`);
      if (onOpen) onOpen();

      let msg: string | undefined = this.preOpenMessages.shift();
      while (msg) {
        this.ws.send(msg);
        msg = this.preOpenMessages.shift();
      }
    };

    this.ws.onmessage = (message) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(message.data);
      } catch {
        if (this.onLog) this.onLog(`Non-JSON message received: ${message.data}`);
        return;
      }
      if (!parsed || !parsed.event) {
        if (this.onLog) this.onLog(`Invalid message received: ${parsed}`);
        return;
      }
      const parsedEvent = String(parsed.event);
      if (this.onLog) this.onLog(`Event ${parsedEvent} received: ${JSON.stringify(parsed.data)}`);
      if (this.events[parsedEvent]) this.events[parsedEvent](parsed.data);
    };
  }

  /**
   * Adds an event handler for the given event name.
   * Currently, only one handler can be assigned per event name.
   */
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
