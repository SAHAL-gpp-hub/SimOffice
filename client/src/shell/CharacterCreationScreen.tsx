/**
 * SCR-07 — Character Creation (UIUXD v2.1 §SCR-07, API Spec §11.1)
 *
 * Appears for first-time students who joined successfully but have no
 * appearance saved (`response.appearance === {}`).
 *
 * Phase 0 scope: Body color/pattern ONLY. No hats/outfits (MVP constraint).
 * Sends PATCH /roster-entries/{id}/character on confirm.
 */

import { useState, useId, useEffect } from 'react';
import { updateCharacter, isApiError } from '../api/roster';
import { useShellStore } from './store';
import { COLOR_SCHEMES } from './appearanceCatalog';
import { previewAppearance, enterWorld } from './engineBridge';

export function CharacterCreationScreen() {
  const displayNameId = useId();

  const { joinResult, enterWorld: finishCreation } = useShellStore();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview: send color hex to Babylon engine as selection changes
  useEffect(() => {
    if (selectedColor) {
      const hex = COLOR_SCHEMES.find((c) => c.id === selectedColor)?.hex;
      if (hex) {
        previewAppearance(hex);
      }
    }
  }, [selectedColor]);

  // Type safety: joinResult must exist to render this screen, but we guard it
  if (!joinResult) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColor) return;

    setError(null);
    setLoading(true);

    try {
      const payload = {
        appearance: { colorScheme: selectedColor },
        // Always send displayName since we're collecting it here to confirm/change
        displayName: displayName || undefined,
      };

      const result = await updateCharacter(
        joinResult.rosterEntryId,
        joinResult.token,
        payload
      );

      // Tell engine to activate world controls
      enterWorld(result.appearance);
      // Update shell state to hide UI
      finishCreation(result.appearance);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 400) {
          setError('Invalid color selection. Please pick again.');
        } else if (err.status === 403) {
          setError('Session expired. Please join again.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('Network error — check your connection and try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="shell-panel shell-panel--wide" role="main" aria-label="Character Creation">
      <h1 className="shell-panel__title">Customize Your ID Badge</h1>
      <p className="shell-panel__subtitle">
        Pick a color for your digital presence. You can change this later.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div
          className="shell-swatch-grid"
          role="radiogroup"
          aria-label="Color scheme"
        >
          {COLOR_SCHEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selectedColor === option.id}
              className={`shell-swatch ${selectedColor === option.id ? 'shell-swatch--selected' : ''}`}
              style={{ backgroundColor: option.hex, color: option.darkText ? '#000' : '#fff' }}
              onClick={() => setSelectedColor(option.id)}
              disabled={loading}
              aria-label={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="shell-field">
          <label htmlFor={displayNameId} className="shell-field__label">
            Display name
          </label>
          <input
            id={displayNameId}
            className="shell-field__input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
            maxLength={30}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <p className="shell-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="shell-btn shell-btn--primary"
          disabled={loading || !selectedColor || displayName.trim().length < 1}
        >
          {loading ? 'Saving…' : 'Enter Office'}
        </button>
      </form>
    </div>
  );
}
