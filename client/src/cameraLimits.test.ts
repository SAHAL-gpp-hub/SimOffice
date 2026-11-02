import { describe, expect, it } from 'vitest';
import {
    computeCameraBetaLimits,
    CEILING_MAX_CAM_Y,
    FLOOR_MIN_CAM_Y,
} from './characterController';

describe('computeCameraBetaLimits', () => {
    it('guarantees camera Y never exceeds CEILING_MAX_CAM_Y when looking down at feet at default standing height', () => {
        const targetY = 1.5;
        const radius = 3.2;
        const { lowerBetaLimit, upperBetaLimit } = computeCameraBetaLimits(targetY, radius);

        // At minimum beta (pitching down toward feet), camera Y is highest: targetY + radius * cos(beta)
        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(CEILING_MAX_CAM_Y + 0.001);

        // At maximum beta (pitching up toward ceiling), camera Y is lowest: targetY + radius * cos(beta)
        const lowestCamY = targetY + radius * Math.cos(upperBetaLimit);
        expect(lowestCamY).toBeGreaterThanOrEqual(FLOOR_MIN_CAM_Y - 0.001);

        // Confirm beta angle allows looking down at character's feet
        expect(lowerBetaLimit).toBeLessThan(Math.PI / 2); // strictly below horizontal
        // Confirm upper beta angle allows looking straight ahead and upward
        expect(upperBetaLimit).toBeGreaterThan(Math.PI / 2); // strictly above horizontal
    });

    it('guarantees camera Y never exceeds CEILING_MAX_CAM_Y during jump apex', () => {
        const targetY = 2.5; // jump apex clamp in characterController
        const radius = 3.2;
        const { lowerBetaLimit } = computeCameraBetaLimits(targetY, radius);

        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(CEILING_MAX_CAM_Y + 0.001);
    });

    it('guarantees camera Y never exceeds CEILING_MAX_CAM_Y at maximum zoom out', () => {
        const targetY = 1.5;
        const radius = 3.5; // upperRadiusLimit
        const { lowerBetaLimit } = computeCameraBetaLimits(targetY, radius);

        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(CEILING_MAX_CAM_Y + 0.001);
    });

    it('allows steep top-down angles when zoomed in close without penetrating the ceiling', () => {
        const targetY = 1.5;
        const radius = 0.5;
        const { lowerBetaLimit } = computeCameraBetaLimits(targetY, radius);

        expect(lowerBetaLimit).toBeLessThan(0.3); // can look almost straight down
        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(CEILING_MAX_CAM_Y + 0.001);
    });

    it('guarantees bounds when sitting at a low desk / lounge chair', () => {
        const targetY = 0.8;
        const radius = 3.2;
        const { lowerBetaLimit, upperBetaLimit } = computeCameraBetaLimits(targetY, radius);

        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(CEILING_MAX_CAM_Y + 0.001);

        const lowestCamY = targetY + radius * Math.cos(upperBetaLimit);
        expect(lowestCamY).toBeGreaterThanOrEqual(FLOOR_MIN_CAM_Y - 0.001);
    });

    it('guarantees camera bounds on Floor 2 (y = 14.0m) at standing height', () => {
        const floorBaseY = 14.0;
        const targetY = floorBaseY + 1.5; // 15.5m
        const radius = 3.2;
        const { lowerBetaLimit, upperBetaLimit } = computeCameraBetaLimits(targetY, radius, floorBaseY);

        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(floorBaseY + CEILING_MAX_CAM_Y + 0.001);

        const lowestCamY = targetY + radius * Math.cos(upperBetaLimit);
        expect(lowestCamY).toBeGreaterThanOrEqual(floorBaseY + FLOOR_MIN_CAM_Y - 0.001);
    });

    it('guarantees camera bounds on Floor 2 when sitting at a frontend workstation (y = 14.5m)', () => {
        const floorBaseY = 14.0;
        const targetY = floorBaseY + 0.8; // 14.8m
        const radius = 3.2;
        const { lowerBetaLimit, upperBetaLimit } = computeCameraBetaLimits(targetY, radius, floorBaseY);

        const highestCamY = targetY + radius * Math.cos(lowerBetaLimit);
        expect(highestCamY).toBeLessThanOrEqual(floorBaseY + CEILING_MAX_CAM_Y + 0.001);

        const lowestCamY = targetY + radius * Math.cos(upperBetaLimit);
        expect(lowestCamY).toBeGreaterThanOrEqual(floorBaseY + FLOOR_MIN_CAM_Y - 0.001);
    });
});
