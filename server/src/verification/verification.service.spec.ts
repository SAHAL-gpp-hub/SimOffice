import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { DbService } from '../db/db.service';
import { SandboxProvider, SANDBOX_PROVIDER } from '../sandbox/sandbox.types';
import {
  ROOM_BROADCASTER,
  RoomBroadcaster,
  VerificationRunRecord,
} from './verification.types';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockDbService: any;
  let mockSandbox: any;
  let mockBroadcaster: any;

  beforeEach(async () => {
    // Mock DB queries
    mockDbService = {
      selectFrom: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
      insertInto: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returningAll: jest.fn().mockReturnThis(),
      executeTakeFirstOrThrow: jest.fn().mockResolvedValue({
        id: 'run-1',
        team_id: 'team-1',
        verification_check_id: 'check-1',
        triggered_by_roster_entry_id: null,
        result: 'pass',
        diagnostic_details: {},
        ran_at: new Date(),
      }),
      transaction: jest.fn().mockReturnValue({
        execute: jest.fn().mockImplementation(async (cb) => {
          return cb({
            selectFrom: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            selectAll: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            forUpdate: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue([]),
            executeTakeFirst: jest.fn().mockResolvedValue({ id: 'team-1' }),
            updateTable: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
          });
        }),
      }),
    };

    mockSandbox = {
      runVerification: jest.fn().mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      }),
    };

    mockBroadcaster = {
      broadcastVerificationResult: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: DbService, useValue: mockDbService },
        { provide: SANDBOX_PROVIDER, useValue: mockSandbox },
        { provide: ROOM_BROADCASTER, useValue: mockBroadcaster },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  describe('submitVerification', () => {
    it('runs checks sequentially and broadcasts them', async () => {
      mockDbService.execute.mockResolvedValueOnce([
        { id: 'check-1', harness_ref: 'ref1', check_type: 'diagnostic' },
        { id: 'check-2', harness_ref: 'ref2', check_type: 'full_fix' },
      ]);

      const runs = await service.submitVerification(
        { id: 'env-1' },
        'team-1',
        'variant-1',
        null,
      );

      expect(runs).toHaveLength(2);
      expect(mockSandbox.runVerification).toHaveBeenCalledTimes(2);
      expect(mockBroadcaster.broadcastVerificationResult).toHaveBeenCalledTimes(
        2,
      );
      expect(mockDbService.transaction).toHaveBeenCalledTimes(1);
    });

    it('handles sandbox timeouts (resource_limit_exceeded)', async () => {
      mockDbService.execute.mockResolvedValueOnce([
        { id: 'check-1', harness_ref: 'ref1', check_type: 'full_fix' },
      ]);
      mockSandbox.runVerification.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
        timedOut: true,
      });

      // Override insert to reflect the resource limit exceeded state
      mockDbService.executeTakeFirstOrThrow.mockResolvedValueOnce({
        id: 'run-1',
        team_id: 'team-1',
        verification_check_id: 'check-1',
        triggered_by_roster_entry_id: null,
        result: 'resource_limit_exceeded',
        diagnostic_details: {},
        ran_at: new Date(),
      });

      const runs = await service.submitVerification(
        { id: 'env-1' },
        'team-1',
        'variant-1',
        null,
      );

      expect(runs[0].result).toBe('resource_limit_exceeded');
    });

    it('catches thrown exceptions safely and reports error', async () => {
      mockDbService.execute.mockResolvedValueOnce([
        { id: 'check-1', harness_ref: 'ref1', check_type: 'full_fix' },
      ]);
      mockSandbox.runVerification.mockRejectedValueOnce(
        new Error('Network failure'),
      );

      mockDbService.executeTakeFirstOrThrow.mockResolvedValueOnce({
        id: 'run-1',
        team_id: 'team-1',
        verification_check_id: 'check-1',
        triggered_by_roster_entry_id: null,
        result: 'error',
        diagnostic_details: {},
        ran_at: new Date(),
      });

      const runs = await service.submitVerification(
        { id: 'env-1' },
        'team-1',
        'variant-1',
        null,
      );

      expect(runs[0].result).toBe('error');
    });
  });

  describe('deriveOutcomeState', () => {
    it('returns in_progress if zero full_fix checks exist', () => {
      const checks = [{ id: 'c1', check_type: 'diagnostic' }];
      const runs: any[] = [];
      const state = service.deriveOutcomeState(checks, runs);
      expect(state).toBe('in_progress');
    });

    it('returns in_progress if a full_fix check has zero runs', () => {
      const checks = [
        { id: 'c1', check_type: 'diagnostic' },
        { id: 'c2', check_type: 'full_fix' },
      ];
      // Only diagnostic ran
      const runs = [{ verification_check_id: 'c1', result: 'pass' }];
      const state = service.deriveOutcomeState(checks, runs);
      expect(state).toBe('in_progress');
    });

    it('returns resolved when all full_fix checks pass', () => {
      const checks = [
        { id: 'c1', check_type: 'full_fix' },
        { id: 'c2', check_type: 'full_fix' },
      ];
      const runs = [
        { verification_check_id: 'c1', result: 'pass' },
        { verification_check_id: 'c2', result: 'pass' },
      ];
      const state = service.deriveOutcomeState(checks, runs);
      expect(state).toBe('resolved');
    });

    it('returns in_progress if any full_fix check fails', () => {
      const checks = [
        { id: 'c1', check_type: 'full_fix' },
        { id: 'c2', check_type: 'full_fix' },
      ];
      const runs = [
        { verification_check_id: 'c1', result: 'pass' },
        { verification_check_id: 'c2', result: 'fail' },
      ];
      const state = service.deriveOutcomeState(checks, runs);
      expect(state).toBe('in_progress');
    });
  });
});
