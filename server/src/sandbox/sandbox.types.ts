export interface ResourceLimits {
  cpuCores: number;
  memoryMb: number;
  wallClockTimeoutMs: number;
}

export interface EnvironmentRef {
  id: string;
}

export interface CheckResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export interface VerificationResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export interface ScenarioVariant {
  image: 'node:22-alpine' | 'node:18-alpine' | 'alpine';
  // other scenario fields omitted for M0.2d
}

export interface FileNode {
  path: string;
  type: 'file' | 'directory';
}

export interface SandboxProvider {
  provision(
    teamId: string,
    scenarioVariant: ScenarioVariant,
    limits: ResourceLimits,
  ): Promise<EnvironmentRef>;
  listFiles(env: EnvironmentRef): Promise<FileNode[]>;
  readFile(env: EnvironmentRef, path: string): Promise<string>;
  writeFile(env: EnvironmentRef, path: string, content: string): Promise<void>;
  runCheck(env: EnvironmentRef): Promise<CheckResult>;
  runVerification(
    env: EnvironmentRef,
    harnessRef: string,
    signal?: AbortSignal,
  ): Promise<VerificationResult>;
  teardown(env: EnvironmentRef): Promise<void>;
}

// Token for dependency injection
export const SANDBOX_PROVIDER = Symbol('SANDBOX_PROVIDER');
