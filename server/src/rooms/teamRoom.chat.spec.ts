import { TeamRoom } from './TeamRoom';
import { TeamRoomState, PlayerState } from './schema/TeamRoomState';
import { Client } from '@colyseus/core';
import { ContributionEventWriter } from '../contribution-tracking/contribution-event-writer.service';

describe('TeamRoom Chat', () => {
  let room: TeamRoom;
  let mockEvents: jest.Mocked<ContributionEventWriter>;
  
  beforeEach(() => {
    room = new TeamRoom();
    room.state = new TeamRoomState();
    
    mockEvents = {
      writeChatMessage: jest.fn(),
    } as any;

    // Mock room methods
    room.broadcast = jest.fn();
    room.setMetadata = jest.fn();
    room.clients = [] as any;

    room.onCreate({ teamId: 'test-team', events: mockEvents });
  });

  const createMockClient = (sessionId: string): Client => {
    const client = { sessionId, send: jest.fn() } as unknown as Client;
    room.clients.push(client);
    
    const player = new PlayerState();
    player.x = 0; player.z = 0; player.connected = true;
    player.rosterEntryId = `roster-${sessionId}`;
    player.displayName = `Name ${sessionId}`;
    room.state.players.set(sessionId, player);
    
    return client;
  };

  const getHandler = (messageType: string) => {
    // Room uses an internal property or we can intercept onMessage
    // Since TeamRoom uses `this.onMessage('sendChat', handler)`, we can access it if we mock `onMessage`
    // Wait, let's just intercept onMessage in a fresh room instance
    const handlers = new Map<string, Function>();
    const originalOnMessage = room.onMessage.bind(room);
    jest.spyOn(room, 'onMessage').mockImplementation((type: string | number, handler: any) => {
      handlers.set(String(type), handler);
      originalOnMessage(type, handler);
      return room;
    });
    
    // Re-run onCreate to capture handlers
    room.onCreate({ teamId: 'test-team', events: mockEvents });
    return handlers.get(messageType);
  };

  it('1. Department message appended to chatLog and broadcasted', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    
    handler(client1, { channel: 'department', message: 'Hello team!' });
    
    expect(room.state.chatLog.length).toBe(1);
    expect(room.state.chatLog[0].message).toBe('Hello team!');
    expect(room.broadcast).toHaveBeenCalledWith('chatPosted', expect.objectContaining({
      channel: 'department',
      message: 'Hello team!'
    }));
  });

  it('2. Proximity message NOT appended to chatLog, sent to in-range clients', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    const client2 = createMockClient('client2'); // at 0,0 - in range
    
    handler(client1, { channel: 'proximity', message: 'Hello nearby!' });
    
    expect(room.state.chatLog.length).toBe(0);
    expect(client2.send).toHaveBeenCalledWith('chatPosted', expect.objectContaining({
      channel: 'proximity',
      message: 'Hello nearby!'
    }));
  });

  it('3. Out-of-range client receives nothing on proximity sendChat', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    const clientFar = createMockClient('clientFar');
    room.state.players.get('clientFar')!.x = 20; // > 8 units away
    
    handler(client1, { channel: 'proximity', message: 'Hello nearby!' });
    
    expect(room.state.chatLog.length).toBe(0);
    expect(clientFar.send).not.toHaveBeenCalled();
  });

  it('4. Empty / whitespace-only message is silently dropped', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    
    handler(client1, { channel: 'department', message: '   ' });
    
    expect(room.state.chatLog.length).toBe(0);
    expect(room.broadcast).not.toHaveBeenCalled();
  });

  it('5. Message > 500 chars is truncated', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    const longMsg = 'A'.repeat(600);
    
    handler(client1, { channel: 'department', message: longMsg });
    
    expect(room.state.chatLog.length).toBe(1);
    expect(room.state.chatLog[0].message.length).toBe(500);
  });

  it('6. chatLog ring-buffer limits to 200 messages', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    
    for (let i = 0; i < 205; i++) {
      handler(client1, { channel: 'department', message: `Msg ${i}` });
    }
    
    expect(room.state.chatLog.length).toBe(200);
    expect(room.state.chatLog[0].message).toBe('Msg 5');
    expect(room.state.chatLog[199].message).toBe('Msg 204');
  });

  it('7. writeChatMessage is called with correct arguments', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    room['classSessionId'] = 'session-123';
    
    handler(client1, { channel: 'department', message: 'Log this!' });
    
    expect(mockEvents.writeChatMessage).toHaveBeenCalledWith(
      'test-team',
      'session-123',
      'roster-client1',
      'department',
      'Log this!'
    );
  });

  it('8. Proximity message DOES call writeChatMessage but does NOT change chatLog length', () => {
    const handler = getHandler('sendChat');
    const client1 = createMockClient('client1');
    
    handler(client1, { channel: 'proximity', message: 'Log nearby!' });
    
    expect(mockEvents.writeChatMessage).toHaveBeenCalledWith(
      'test-team',
      undefined,
      'roster-client1',
      'proximity',
      'Log nearby!'
    );
    expect(room.state.chatLog.length).toBe(0);
  });
});
