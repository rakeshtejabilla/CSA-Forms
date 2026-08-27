import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOrganization')
  handleJoinOrganization(client: Socket, organizationId: string) {
    client.join(organizationId);
    return { event: 'joined', data: organizationId };
  }

  notifyOrganization(organizationId: string, event: string, data: any) {
    this.server.to(organizationId).emit(event, data);
  }

  notifyAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
