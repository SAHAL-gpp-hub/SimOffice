import { Test, TestingModule } from '@nestjs/testing';
import { WorkstationService } from './workstation.service';
import { DbService } from '../db/db.service';
import { SandboxProvider, SANDBOX_PROVIDER } from '../sandbox/sandbox.types';
import { VerificationService } from '../verification/verification.service';
import { BadRequestException, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';

describe('WorkstationService', () => {
  let service: WorkstationService;
  let mockDbService: any;
  let mockSandboxProvider: any;
  let mockVerificationService: any;

  beforeEach(async () => {
    mockDbService = {
      selectFrom: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue({
        envId: 'test-env-id',
        envStatus: 'ready',
        sessionStatus: 'active',
        scenarioVariantId: 'test-variant-id',
      }),
      insertInto: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    mockSandboxProvider = {
      listFiles: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      runCheck: jest.fn(),
      runVerification: jest.fn(),
    };

    mockVerificationService = {
      submitVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkstationService,
        { provide: DbService, useValue: mockDbService },
        { provide: SANDBOX_PROVIDER, useValue: mockSandboxProvider },
        { provide: VerificationService, useValue: mockVerificationService },
      ],
    }).compile();

    service = module.get<WorkstationService>(WorkstationService);
  });

  describe('validatePath', () => {
    it('should reject paths containing ".." to prevent directory traversal', async () => {
      await expect(service.readFile('team-1', '../etc/passwd')).rejects.toThrow(BadRequestException);
      await expect(service.readFile('team-1', 'src/../../secret.txt')).rejects.toThrow(BadRequestException);
    });

    it('should reject paths starting with "/" to prevent absolute path access', async () => {
      await expect(service.readFile('team-1', '/etc/passwd')).rejects.toThrow(BadRequestException);
    });

    it('should accept valid paths', async () => {
      mockSandboxProvider.readFile.mockResolvedValue('content');
      const result = await service.readFile('team-1', 'src/main.ts');
      expect(result.path).toBe('src/main.ts');
    });
  });

  describe('writeFile', () => {
    it('should throw PayloadTooLargeException if file content exceeds 1MB', async () => {
      const largeContent = Buffer.alloc(1024 * 1024 + 1, 'a').toString('utf8');
      await expect(
        service.writeFile('team-1', 'src/large.txt', largeContent, { id: 'roster-1', sessionId: 'session-1' }),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('should allow file content under 1MB', async () => {
      const content = Buffer.alloc(1024 * 1024 - 1, 'a').toString('utf8');
      mockSandboxProvider.writeFile.mockResolvedValue(undefined);
      
      const result = await service.writeFile('team-1', 'src/ok.txt', content, { id: 'roster-1', sessionId: 'session-1' });
      expect(result.saved).toBe(true);
      expect(mockSandboxProvider.writeFile).toHaveBeenCalled();
    });
  });

  describe('runCheck', () => {
    it('should throw UnprocessableEntityException if the check times out', async () => {
      mockSandboxProvider.runCheck.mockResolvedValue({
        exitCode: 124,
        stdout: '',
        stderr: 'Timeout',
        timedOut: true,
      });

      await expect(service.runCheck('team-1', { id: 'roster-1', sessionId: 'session-1' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should return pass if exitCode is 0', async () => {
      mockSandboxProvider.runCheck.mockResolvedValue({
        exitCode: 0,
        stdout: 'Success',
        stderr: '',
        timedOut: false,
      });

      const result = await service.runCheck('team-1', { id: 'roster-1', sessionId: 'session-1' });
      expect(result.result).toBe('pass');
    });
  });
});
