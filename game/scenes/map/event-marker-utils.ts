import type { MapEventData } from '../../EventBus';
import type { MarkerType } from '../../config/markerConfig';

export type EventMarkerType = Extract<MarkerType, 'burn' | 'death' | 'fight'>;

export function getEventMarkerId(
  prefix: EventMarkerType,
  event: Pick<MapEventData, 'id' | 'wikiPageID'>,
  index: number
): string {
  const rawId = event.id ?? event.wikiPageID ?? index;
  return `${prefix}-${rawId}`;
}

export function isEventMarkerType(type: MarkerType): type is EventMarkerType {
  return type === 'burn' || type === 'death' || type === 'fight';
}
