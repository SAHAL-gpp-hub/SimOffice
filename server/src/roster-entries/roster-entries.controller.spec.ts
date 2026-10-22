import { Test, TestingModule } from '@nestjs/testing';
import { RosterEntriesController } from './roster-entries.controller';
import { RosterEntriesService } from './roster-entries.service';
import { RosterGuard } from '../sessions/roster/roster.guard';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// Minimal mock req object — RosterGuard populates req.user in real requests;
// we override the guard below to keep tests DB-free.
const makeReq = (userId: string) => ({ user: { id: userId, role: 'student' } });

describe('RosterEntriesController', () => {
  let controller: RosterEntriesController;
  let service: RosterEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RosterEntriesController],
      providers: [
        {
          provide: RosterEntriesService,
          useValue: {
            updateCharacter: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RosterGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RosterEntriesController>(RosterEntriesController);
    service = module.get<RosterEntriesService>(RosterEntriesService);
  });

  describe('PATCH /:rosterEntryId/character', () => {
    const ROSTER_ENTRY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const validBody = {
      appearance: { colorScheme: 'bright-blue' as const },
      displayName: 'Rahul',
    };
    const serviceResponse = {
      rosterEntryId: ROSTER_ENTRY_ID,
      displayName: 'Rahul',
      appearance: { colorScheme: 'bright-blue' },
    };

    it('returns 200 with rosterEntryId, displayName, appearance on happy path', async () => {
      jest.spyOn(service, 'updateCharacter').mockResolvedValue(serviceResponse);

      const result = await controller.updateCharacter(
        ROSTER_ENTRY_ID,
        validBody,
        makeReq(ROSTER_ENTRY_ID),
      );

      expect(result).toEqual(serviceResponse);
      expect(service.updateCharacter).toHaveBeenCalledWith(
        ROSTER_ENTRY_ID,
        ROSTER_ENTRY_ID,
        validBody.appearance,
        validBody.displayName,
      );
    });

    it('propagates 403 FORBIDDEN when token sub does not match path param', async () => {
      jest
        .spyOn(service, 'updateCharacter')
        .mockRejectedValue(new ForbiddenException('FORBIDDEN'));

      await expect(
        controller.updateCharacter(
          ROSTER_ENTRY_ID,
          validBody,
          makeReq('different-user-id'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates 404 NOT_FOUND when roster entry does not exist', async () => {
      jest
        .spyOn(service, 'updateCharacter')
        .mockRejectedValue(new NotFoundException('NOT_FOUND'));

      await expect(
        controller.updateCharacter(
          ROSTER_ENTRY_ID,
          validBody,
          makeReq(ROSTER_ENTRY_ID),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates 400 VALIDATION_ERROR when colorScheme is not in the allow-list', async () => {
      jest
        .spyOn(service, 'updateCharacter')
        .mockRejectedValue(new BadRequestException('VALIDATION_ERROR'));

      await expect(
        controller.updateCharacter(
          ROSTER_ENTRY_ID,
          // Cast to bypass TS — Zod pipe would catch this in the real app
          { appearance: { colorScheme: 'neon-rainbow' as any } },
          makeReq(ROSTER_ENTRY_ID),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
