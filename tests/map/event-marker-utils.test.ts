import { getEventMarkerId, isEventMarkerType } from '@/game/scenes/map/event-marker-utils';

describe('event marker utilities', () => {
  describe('getEventMarkerId', () => {
    it('prefers explicit event IDs over wiki page IDs and array indexes', () => {
      expect(getEventMarkerId('burn', { id: 'burned-123', wikiPageID: 456 }, 9)).toBe(
        'burn-burned-123'
      );
    });

    it('uses wiki page IDs when explicit IDs are missing', () => {
      expect(getEventMarkerId('death', { wikiPageID: 5129 }, 4)).toBe('death-5129');
    });

    it('falls back to the event array index when no stable ID exists', () => {
      expect(getEventMarkerId('fight', {}, 2)).toBe('fight-2');
    });
  });

  describe('isEventMarkerType', () => {
    it('identifies event marker layers', () => {
      expect(isEventMarkerType('burn')).toBe(true);
      expect(isEventMarkerType('death')).toBe(true);
      expect(isEventMarkerType('fight')).toBe(true);
      expect(isEventMarkerType('location')).toBe(false);
      expect(isEventMarkerType('character')).toBe(false);
    });
  });
});
