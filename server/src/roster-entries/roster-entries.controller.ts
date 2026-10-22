import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import { RosterEntriesService, VALID_COLOR_SCHEMES } from './roster-entries.service';
import { RosterGuard } from '../sessions/roster/roster.guard';
import { ZodValidationPipe } from '../zod-validation.pipe';

// Request body schema — appearance is opaque JSON at the API layer (API Spec §11.1),
// but we validate colorScheme against the pilot's Phase 0 allow-list here.
// displayName is accepted on this endpoint so the client can update both in one call.
const updateCharacterSchema = z.object({
  appearance: z.object({
    colorScheme: z.enum(VALID_COLOR_SCHEMES),
  }),
  displayName: z.string().min(1).max(30).optional(),
});

type UpdateCharacterDto = z.infer<typeof updateCharacterSchema>;

@Controller('roster-entries')
export class RosterEntriesController {
  constructor(private readonly rosterEntriesService: RosterEntriesService) {}

  /**
   * PATCH /roster-entries/:rosterEntryId/character
   *
   * API Spec v1.1 §11.1 — first-session character creation (appearance, name tag),
   * persisted across sessions per PRD §15.4.
   *
   * Auth: Student roster token; rosterEntryId MUST match the token's sub claim.
   * Response 200: { rosterEntryId, displayName, appearance }
   */
  @Patch(':rosterEntryId/character')
  @UseGuards(RosterGuard)
  @UsePipes(new ZodValidationPipe(updateCharacterSchema))
  async updateCharacter(
    @Param('rosterEntryId') rosterEntryId: string,
    @Body() body: UpdateCharacterDto,
    @Req() req,
  ) {
    console.log(`[RosterEntriesController] updateCharacter called with body:`, body);
    return this.rosterEntriesService.updateCharacter(
      rosterEntryId,
      req.user.id, // token sub — must match path param (enforced in service)
      body.appearance,
      body.displayName,
    );
  }
}
