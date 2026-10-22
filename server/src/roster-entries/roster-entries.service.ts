import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';

// Phase 0 cosmetic catalog — must mirror client/src/shell/appearanceCatalog.ts.
// Server validates incoming colorScheme against this list (API Spec §11.1's
// "simple allow-list" note). Growing the catalog is a content change, not a
// schema change, consistent with DBD §3.5/§2.4's reasoning.
export const VALID_COLOR_SCHEMES = [
  'bright-blue',
  'coral-red',
  'forest-green',
  'golden-yellow',
  'lavender-purple',
  'ocean-teal',
  'rose-pink',
  'slate-grey',
] as const;

export type ColorScheme = (typeof VALID_COLOR_SCHEMES)[number];

export interface AppearancePayload {
  colorScheme: ColorScheme;
}

@Injectable()
export class RosterEntriesService {
  constructor(private readonly db: DbService) {}

  /**
   * PATCH /roster-entries/{rosterEntryId}/character (API Spec §11.1)
   *
   * Persists the student's appearance selection to roster_entries.appearance
   * (DBD v1.1 §6). The rosterEntryId must match the token's sub claim —
   * enforced here at the service level (the controller also checks via the
   * guard's req.user.id, but we verify explicitly for defence in depth).
   */
  async updateCharacter(
    rosterEntryId: string,
    requestingUserId: string,
    appearance: AppearancePayload,
    displayName?: string,
  ): Promise<{
    rosterEntryId: string;
    displayName: string;
    appearance: AppearancePayload;
  }> {
    // Auth check: path param must match token sub (API Spec §11.1)
    if (rosterEntryId !== requestingUserId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    // Validate colorScheme against the server-side allow-list (API Spec §11.1)
    if (!VALID_COLOR_SCHEMES.includes(appearance.colorScheme as ColorScheme)) {
      throw new BadRequestException(
        `VALIDATION_ERROR: unknown colorScheme "${appearance.colorScheme}"`,
      );
    }

    // Build the update — display_name update is optional (SCR-07 submits one
    // but the endpoint could be called without it in future Phase 1 contexts)
    const updateValues: Record<string, unknown> = {
      appearance: JSON.stringify(appearance),
    };
    if (displayName !== undefined && displayName.trim().length > 0) {
      updateValues.display_name = displayName.trim().slice(0, 30);
    }

    const updated = await this.db
      .updateTable('roster_entries')
      .set(updateValues)
      .where('id', '=', rosterEntryId)
      .returning(['id', 'display_name', 'appearance'])
      .executeTakeFirst();

    if (!updated) {
      throw new NotFoundException('NOT_FOUND');
    }

    return {
      rosterEntryId: updated.id,
      displayName: updated.display_name,
      appearance: updated.appearance as unknown as AppearancePayload,
    };
  }
}
