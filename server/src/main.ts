import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { TeamRoom } from './rooms/TeamRoom';
import { ContributionEventWriter } from './contribution-tracking/contribution-event-writer.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Extract raw HTTP server
  const server = app.getHttpServer();

  // Attach Colyseus server
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server,
      verifyClient: (info, next) => {
        // Basic origin check or other validation can go here if needed.
        // For M0.3c, we rely on the JWT auth step inside the Room itself.
        next(true);
      },
    }),
  });

  const contributionEventWriter = app.get(ContributionEventWriter);

  gameServer
    .define('team_room', TeamRoom, {
      events: contributionEventWriter,
    })
    .filterBy(['teamId']);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
