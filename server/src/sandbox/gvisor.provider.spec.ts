import { Test, TestingModule } from '@nestjs/testing';
import { GVisorProvider } from './gvisor.provider';
import * as fs from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('GVisorProvider', () => {
  let provider: GVisorProvider;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    process.env.ORCHESTRATOR_URL = 'http://localhost:8080';
    process.env.ORCHESTRATOR_SECRET = 'test-secret';

    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(jest.fn());

    const module: TestingModule = await Test.createTestingModule({
      providers: [GVisorProvider],
    }).compile();

    provider = module.get<GVisorProvider>(GVisorProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('provision', () => {
    it('should provision an environment and return ref', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ envId: 'env-123' }),
      });

      const ref = await provider.provision(
        'team-1',
        { image: 'node:22-alpine' },
        { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 30000 },
      );
      expect(ref.id).toBe('env-123');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/provision',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-secret',
          }),
          body: JSON.stringify({
            image: 'node:22-alpine',
            limits: { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 30000 },
          }),
        }),
      );
    });

    it('should throw on failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(
        provider.provision(
          'team-2',
          { image: 'alpine' },
          { cpuCores: 1, memoryMb: 128, wallClockTimeoutMs: 30000 },
        ),
      ).rejects.toThrow('Orchestrator /provision failed: 400 Bad Request');
    });
  });

  describe('runVerification', () => {
    it('should call runVerification on orchestrator with read harness content', async () => {
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        'mocked harness code',
      );

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stdout: 'passed',
          stderr: '',
          exitCode: 0,
          error: null,
        }),
      });

      const res = await provider.runVerification(
        { id: 'env-123' },
        '/mock/path/harness.js',
      );
      expect(res.stdout).toBe('passed');
      expect(fs.promises.readFile).toHaveBeenCalledWith(
        '/mock/path/harness.js',
        'utf8',
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/runVerification',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            envId: 'env-123',
            harnessContent: 'mocked harness code',
            timeoutMs: 30000,
          }),
        }),
      );
    });
  });

  describe('readFile and writeFile', () => {
    it('should read file', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'hello' }),
      });

      const content = await provider.readFile({ id: 'env-1' }, 'test.txt');
      expect(content).toBe('hello');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/readFile',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ envId: 'env-1', path: 'test.txt' }),
        }),
      );
    });

    it('should write file', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await provider.writeFile({ id: 'env-1' }, 'test.txt', 'hello');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/writeFile',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            envId: 'env-1',
            path: 'test.txt',
            content: 'hello',
          }),
        }),
      );
    });
  });
});
