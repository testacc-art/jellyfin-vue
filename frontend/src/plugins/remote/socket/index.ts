import { useWebSocket } from '@vueuse/core';
import destr from 'destr';
import { isNil } from 'lodash-es';
import { computed, watch } from 'vue';
import auth from '../auth';
import sdk from '../sdk';
import { WebSocketMessage } from './types';

/**
 * Formats the message to be sent to the socket
 */
function formatSocketMessage(
  name: string,
  data?: Record<string, unknown>
): string {
  const message: WebSocketMessage = { MessageType: name };

  if (!isNil(data)) {
    message.Data = data;
  }

  return JSON.stringify(message);
}

const socketUrl = computed(() => {
  if (
    auth.currentUserToken &&
    auth.currentServer &&
    sdk.deviceInfo.id &&
    sdk.api?.basePath
  ) {
    const socketParameters = new URLSearchParams({
      api_key: auth.currentUserToken,
      deviceId: sdk.deviceInfo.id
    }).toString();

    return `${sdk.api.basePath}/socket?${socketParameters}`
      .replace('https:', 'wss:')
      .replace('http:', 'ws:');
  }
});

const { data, send } = useWebSocket(socketUrl, {
  heartbeat: false,
  autoReconnect: { retries: () => true },
  immediate: true,
  autoClose: false
});

class RemotePluginSocket {
  public get message(): WebSocketMessage | null {
    return destr(data.value) as WebSocketMessage | null;
  }

  /**
   * Send message to socket
   * @param name - Name of the message type to be sent
   * @param data - Payload to send
   */
  public sendToSocket(
    ...arguments_: Parameters<typeof formatSocketMessage>
  ): void {
    send(formatSocketMessage(...arguments_));
  }

  public constructor() {
    watch(
      () => this.message,
      () => {
        if (this.message?.MessageType === 'ForceKeepAlive') {
          this.sendToSocket('KeepAlive');
        }
      }
    );
  }
}

const RemotePluginSocketInstance = new RemotePluginSocket();
export default RemotePluginSocketInstance;
