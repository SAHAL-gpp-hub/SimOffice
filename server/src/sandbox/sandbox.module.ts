import { Module, Global } from '@nestjs/common';
import { GVisorProvider } from './gvisor.provider';
import { SANDBOX_PROVIDER } from './sandbox.types';

@Global()
@Module({
  providers: [
    {
      provide: SANDBOX_PROVIDER,
      useClass: GVisorProvider,
    },
  ],
  exports: [SANDBOX_PROVIDER],
})
export class SandboxModule {}
