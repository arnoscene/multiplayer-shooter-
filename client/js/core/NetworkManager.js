/**
 * NetworkManager - Handles all WebSocket communication for the game
 * Centralized network layer for sending/receiving messages
 */
export class NetworkManager {
  constructor() {
    this.ws = null;
    this.handlers = new Map(); // message type -> callback
    this.connected = false;
    this.messageQueue = []; // Queue messages when not connected
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // ms
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL (ws:// or wss://)
   * @returns {Promise<void>} - Resolves when connection is established
   */
  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ Connected to server!');
          this.connected = true;
          this.reconnectAttempts = 0;

          // Flush message queue
          this._flushMessageQueue();

          // Call onopen handler if registered
          const openHandler = this.handlers.get('__onopen');
          if (openHandler) openHandler();

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this._handleMessage(data);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);

          // Call onerror handler if registered
          const errorHandler = this.handlers.get('__onerror');
          if (errorHandler) errorHandler(error);
        };

        this.ws.onclose = () => {
          console.log('Disconnected from server');
          this.connected = false;

          // Call onclose handler if registered
          const closeHandler = this.handlers.get('__onclose');
          if (closeHandler) closeHandler();

          // Attempt reconnection if enabled
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
              this.connect(url).catch(() => {
                console.log('Reconnection failed');
              });
            }, this.reconnectDelay);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming message by routing to registered handlers
   * @param {Object} data - Parsed message data
   * @private
   */
  _handleMessage(data) {
    const handler = this.handlers.get(data.type);
    if (handler) {
      handler(data);
    } else {
      console.warn(`No handler registered for message type: ${data.type}`);
    }
  }

  /**
   * Send message to server
   * @param {string} type - Message type
   * @param {Object} data - Message data (optional)
   */
  send(type, data = {}) {
    const message = { type, ...data };

    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      console.warn(`Not connected, queuing message: ${type}`);
      this.messageQueue.push(message);
    }
  }

  /**
   * Flush queued messages when connection is restored
   * @private
   */
  _flushMessageQueue() {
    if (this.messageQueue.length > 0) {
      console.log(`Flushing ${this.messageQueue.length} queued messages`);
      this.messageQueue.forEach(message => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
        }
      });
      this.messageQueue = [];
    }
  }

  /**
   * Register a message handler for a specific message type
   * @param {string} messageType - Type of message to handle
   * @param {Function} callback - Handler function
   */
  on(messageType, callback) {
    this.handlers.set(messageType, callback);
  }

  /**
   * Unregister a message handler
   * @param {string} messageType - Type of message to remove handler for
   */
  off(messageType) {
    this.handlers.delete(messageType);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.messageQueue = [];
  }

  /**
   * Check if connected to server
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Set max reconnect attempts (set to 0 to disable auto-reconnect)
   * @param {number} attempts - Maximum reconnection attempts
   */
  setMaxReconnectAttempts(attempts) {
    this.maxReconnectAttempts = attempts;
  }

  /**
   * Set reconnect delay
   * @param {number} delay - Delay in milliseconds
   */
  setReconnectDelay(delay) {
    this.reconnectDelay = delay;
  }

  /**
   * Register handler for connection open event
   * @param {Function} callback - Handler function
   */
  onOpen(callback) {
    this.on('__onopen', callback);
  }

  /**
   * Register handler for connection close event
   * @param {Function} callback - Handler function
   */
  onClose(callback) {
    this.on('__onclose', callback);
  }

  /**
   * Register handler for connection error event
   * @param {Function} callback - Handler function
   */
  onError(callback) {
    this.on('__onerror', callback);
  }
}
