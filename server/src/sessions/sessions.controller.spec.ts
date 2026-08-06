import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController, ClassesController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { JoinCodeThrottlerGuard } from './join-code-throttler.guard';
import { RosterGuard } from './roster/roster.guard';
import { TeacherGuard } from '../auth/teacher/teacher.guard';

describe('SessionsController', () => {
  let controller: SessionsController;
  let classesController: ClassesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController, ClassesController],
      providers: [{ provide: SessionsService, useValue: {} }],
    })
      .overrideGuard(JoinCodeThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RosterGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeacherGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SessionsController>(SessionsController);
    classesController = module.get<ClassesController>(ClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(classesController).toBeDefined();
  });
});
