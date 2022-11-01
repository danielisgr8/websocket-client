# @danielisgr8/websocket-client
A TypeScript WebSocket client for browsers.

Sends messages and expects to receive messages in the following format:
```json
{
  "event": "eventName",
  "data": "string, object, array, number, etc."
}
```
