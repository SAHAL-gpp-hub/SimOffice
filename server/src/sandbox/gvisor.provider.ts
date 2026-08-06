import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import {
  SandboxProvider,
  EnvironmentRef,
  ScenarioVariant,
  ResourceLimits,
  CheckResult,
  VerificationResult,
  FileNode,
} from './sandbox.types';

@Injectable()
export class GVisorProvider implements SandboxProvider {
  private readonly logger = new Logger(GVisorProvider.name);
  private readonly orchestratorUrl: string;
  private readonly secret: string;
  private readonly headers: HeadersInit;

  constructor() {
    this.orchestratorUrl =
      process.env.ORCHESTRATOR_URL || 'http://sandbox-orchestrator:8080';
    this.secret = process.env.ORCHESTRATOR_SECRET || 'dev-secret';
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.secret}`,
    };
  }

  private async request(endpoint: string, body: any, signal?: AbortSignal): Promise<any> {
    const res = await fetch(`${this.orchestratorUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `Orchestrator ${endpoint} failed: ${res.status} ${errBody}`,
      );
    }

    return res.json();
  }

  async provision(
    teamId: string,
    scenarioVariant: ScenarioVariant,
    limits: ResourceLimits,
  ): Promise<EnvironmentRef> {
    this.logger.debug(
      `Provisioning sandbox for team ${teamId} with image ${scenarioVariant.image}`,
    );
    const res = await this.request('/provision', {
      image: scenarioVariant.image,
      limits,
    });
    return { id: res.envId };
  }

  async listFiles(env: EnvironmentRef): Promise<FileNode[]> {
    const res = await this.request('/listFiles', { envId: env.id });
    return res.files;
  }

  async readFile(env: EnvironmentRef, path: string): Promise<string> {
    const res = await this.request('/readFile', { envId: env.id, path });
    return res.content;
  }

  async writeFile(
    env: EnvironmentRef,
    path: string,
    content: string,
  ): Promise<void> {
    await this.request('/writeFile', { envId: env.id, path, content });
  }

  async runCheck(env: EnvironmentRef): Promise<CheckResult> {
    // We assume default wallClockTimeoutMs of 30000 if limits were not persisted on our side,
    // but the orchestrator enforces limits. We'll pass a default 30s timeout to the API.
    const res = await this.request('/runCheck', {
      envId: env.id,
      timeoutMs: 30000,
    });
    return res as CheckResult;
  }

  async runVerification(
    env: EnvironmentRef,
    harnessRef: string,
    signal?: AbortSignal,
  ): Promise<VerificationResult> {
    let harnessContent: string;
    try {
      harnessContent = await fs.promises.readFile(harnessRef, 'utf8');
    } catch (e) {
      this.logger.error(`Failed to read harness file at ${harnessRef}`, e);
      throw new Error(`Failed to load harness for verification: ${harnessRef}`);
    }

    const res = await this.request('/runVerification', {
      envId: env.id,
      harnessContent,
      timeoutMs: 30000,
    }, signal);
    return res as VerificationResult;
  }

  async teardown(env: EnvironmentRef): Promise<void> {
    this.logger.debug(`Tearing down sandbox ${env.id}`);
    const res = await fetch(`${this.orchestratorUrl}/teardown`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ envId: env.id }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `Orchestrator /teardown failed: ${res.status} ${errBody}`,
      );
    }
  }
}
