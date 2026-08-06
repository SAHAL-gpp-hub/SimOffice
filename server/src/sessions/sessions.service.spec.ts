import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { DbService } from '../db/db.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SANDBOX_PROVIDER } from '../sandbox/sandbox.types';

describe('SessionsService', () => {
  let service: SessionsService;
  let dbService: any;

  beforeEach(async () => {
    dbService = {
      selectFrom: jest.fn(),
      updateTable: jest.fn(),
      insertInto: jest.fn(),
      transaction: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: DbService, useValue: dbService },
        { provide: SANDBOX_PROVIDER, useValue: {} },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  // Mock chain builder helper
  const mockDbChain = (result: any) => {
    const chain: any = {
      innerJoin: jest.fn(() => chain),
      leftJoin: jest.fn(() => chain),
      select: jest.fn(() => chain),
      selectAll: jest.fn(() => chain),
      where: jest.fn(() => chain),
      set: jest.fn(() => chain),
      executeTakeFirst: jest.fn().mockResolvedValue(result),
      executeTakeFirstOrThrow: jest.fn().mockResolvedValue(result),
      execute: jest.fn().mockResolvedValue(result),
      values: jest.fn(() => chain),
      returningAll: jest.fn(() => chain),
    };
    return chain;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ownership checks', () => {
    it('should throw ForbiddenException if teacher does not own the session', async () => {
      dbService.selectFrom.mockReturnValue(
        mockDbChain({
          id: 'session-1',
          teacher_account_id: 'teacher-a',
          status: 'created',
        }),
      );

      await expect(
        service.updateSessionDraft('session-1', 'teacher-b', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should proceed if teacher owns the session', async () => {
      dbService.selectFrom.mockReturnValue(
        mockDbChain({
          id: 'session-1',
          teacher_account_id: 'teacher-a',
          status: 'created',
        }),
      );
      dbService.updateTable.mockReturnValue(
        mockDbChain({ numUpdatedRows: 1n }),
      );

      await expect(
        service.updateSessionDraft('session-1', 'teacher-a', {}),
      ).resolves.not.toThrow();
    });
  });

  describe('state transitions', () => {
    it('should reject startSession if session is already active (ConflictException)', async () => {
      // Mock ownership check
      dbService.selectFrom.mockReturnValue(
        mockDbChain({
          id: 'session-1',
          teacher_account_id: 'teacher-a',
          status: 'active',
        }),
      );

      // Mock the CAS update failing (0 rows affected because status is not 'created')
      dbService.updateTable.mockReturnValue(
        mockDbChain({ numUpdatedRows: 0n }),
      );

      await expect(
        service.startSession('session-1', 'teacher-a'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject endSession if session is already torn_down', async () => {
      dbService.selectFrom.mockReturnValue(
        mockDbChain({
          id: 'session-1',
          teacher_account_id: 'teacher-a',
          status: 'torn_down',
        }),
      );

      // Mock the CAS update failing
      dbService.updateTable.mockReturnValue(
        mockDbChain({ numUpdatedRows: 0n }),
      );

      await expect(
        service.endSession('session-1', 'teacher-a'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('idempotency of /start', () => {
    it('should prevent double provisioning via CAS update count', async () => {
      dbService.selectFrom.mockReturnValue(
        mockDbChain({
          id: 'session-1',
          teacher_account_id: 'teacher-a',
          status: 'created',
        }),
      );

      // Simulate a concurrent request having already updated it
      dbService.updateTable.mockReturnValue(
        mockDbChain({ numUpdatedRows: 0n }),
      );

      await expect(
        service.startSession('session-1', 'teacher-a'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
