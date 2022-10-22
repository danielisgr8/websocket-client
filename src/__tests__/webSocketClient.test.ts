import WebSocketClient from '../webSocketClient';

/** A mock WebSocket implementation, as mocking a `window` property is difficult */
class MockWebSocket {
  public onmessage: WebSocket['onmessage'];
  public onopen: WebSocket['onopen'];
  /** Mocked. TS will complain if this isn't the type. */
  public send: WebSocket['send'];
  public url: WebSocket['url'] = '127.0.0.0';
  public readyState: WebSocket['readyState'] = WebSocket.CONNECTING;

  constructor() {
    this.onmessage = null;
    this.onopen = null;
    this.send = jest.fn();
  }
}

describe('WebSocketClient', () => {
  let mockWebSocket: MockWebSocket;
  let webSocket: WebSocket;
  let webSocketClient: WebSocketClient;

  const openWebSocket = () => {
    if (webSocket.onopen === null) throw new Error('onopen is null');
    mockWebSocket.readyState = WebSocket.OPEN;
    webSocket.onopen(new Event('mockType'));
  };

  beforeEach(() => {
    mockWebSocket = new MockWebSocket();
    webSocket = mockWebSocket as WebSocket;
    webSocketClient = new WebSocketClient(webSocket);
  });

  test('calls \'onOpen\' when provided', () => {
    const mockOnOpen = jest.fn();
    webSocketClient = new WebSocketClient(webSocket, mockOnOpen);
    expect(mockOnOpen).toHaveBeenCalledTimes(0);
    openWebSocket();
    expect(mockOnOpen).toHaveBeenCalledTimes(1);
  });

  describe('sendMessage', () => {
    const testSendMessage = (buffer: boolean) => {
      const expectedMessages = [
        { event: '1', data: 'a' },
        { event: '2', data: 'b' },
        { event: '3', data: 'c' },
      ];
      const mockSend = mockWebSocket.send as jest.Mock;

      if (!buffer) {
        expect(mockSend).not.toHaveBeenCalled();
        openWebSocket();
      }

      expectedMessages.forEach(
        (message) => webSocketClient.sendMessage(message.event, message.data),
      );

      if (buffer) {
        expect(mockSend).not.toHaveBeenCalled();
        openWebSocket();
      }

      expect(mockSend).toHaveBeenCalledTimes(expectedMessages.length);
      expectedMessages.forEach((expectedMessage, i) => {
        const actualMessage = mockSend.mock.calls[i][0];
        expect(actualMessage).toBe(JSON.stringify(expectedMessage));
      });
    };

    test('buffers messages sent before the connection has opened', () => testSendMessage(true));
    test('sends message when connection is open', () => testSendMessage(false));
  });

  describe('receiving a message', () => {
    const mockHandler = jest.fn();

    const sendMessage = (data: any) => {
      if (webSocket.onmessage === null) throw new Error('onmessage is null');
      const event = new window.MessageEvent('message', { data });
      webSocket.onmessage(event);
    };

    const sendEvent: typeof WebSocketClient.prototype.sendMessage = (event, data) => {
      sendMessage(JSON.stringify({ event, data }));
    };

    beforeEach(() => {
      jest.resetAllMocks();
      openWebSocket();
    });

    test('calls event handler for matching event', () => {
      const eventType = 'testEvent';
      const eventData = { favoriteColor: 'green or milky tan' };
      webSocketClient.addEventHandler(eventType, mockHandler);

      expect(mockHandler).not.toHaveBeenCalled();

      sendEvent(eventType, eventData);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler.mock.calls[0][0]).toStrictEqual(eventData);
    });

    test('does not call event handler for non-matching event', () => {
      webSocketClient.addEventHandler('someEvent', mockHandler);
      sendEvent('anotherEvent', 'blah');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    test('event listener can be removed', () => {
      const eventType = 'testEvent';
      webSocketClient.addEventHandler(eventType, mockHandler);
      webSocketClient.removeEventHandler(eventType);
      sendEvent(eventType, 'blah');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    test('swallows errors when receiving malformed messages', () => {
      sendMessage('I\'m not even an object!');
      sendMessage(() => 'I\'m not valid JSON!');
      sendMessage({ surprise: 'I don\'t have an \'event\' property' });
      sendMessage({});
      sendMessage([]);
      sendMessage({ event: null });
    });
  });
});
