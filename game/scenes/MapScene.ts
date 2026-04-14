/**
 * MapScene - Main WAGDIE World Map Scene
 *
 * Renders the WAGDIE map with interactive markers for locations,
 * characters, and events. Supports zoom, pan, and marker interactions.
 */

import * as Phaser from 'phaser';
import {
  EventBus,
  MapEvents,
  type LayerVisibility,
  type MapLocationData,
  type MapCharacterData,
  type MapEventsData,
  type FlyToPayload,
  type EditorMode,
} from '../EventBus';

import {
  MAP_WIDTH,
  MAP_HEIGHT,
  COORD_SCALE,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from './map/coords';
import { bindMapSceneEvents, type MapSceneEventHandlers } from './map/event-bindings';
import { MapMarkerManager, type MarkerData } from './map/marker-manager';
import { TooltipController } from './map/tooltip-controller';

type InteractionState =
  | { kind: 'idle' }
  | {
      kind: 'panning';
      dragStartX: number;
      dragStartY: number;
      cameraStartX: number;
      cameraStartY: number;
    }
  | {
      kind: 'dragging-marker';
      marker: Phaser.GameObjects.Sprite;
      markerId: string;
    };

export class MapScene extends Phaser.Scene {
  private mapImage!: Phaser.GameObjects.Image;
  private markerManager: MapMarkerManager | null = null;
  private tooltipController: TooltipController | null = null;
  private layerVisibility: LayerVisibility = {
    locations: true,
    characters: true,
    burns: true,
    deaths: true,
    fights: true,
  };

  // Editor mode state
  private editorMode: EditorMode = 'view';

  // Unified interaction state (camera pan OR marker drag, never both)
  private interaction: InteractionState = { kind: 'idle' };

  private unbindEventBusListeners: (() => void) | null = null;

  constructor() {
    super('MapScene');
  }

  preload(): void {
    // Load map background
    this.load.image('wagdiemap', '/images/wagdiemap.png');

    // Load marker icons
    this.load.image('icon_location', '/images/mapicons/icon_location.png');
    this.load.image('icon_youarehere', '/images/mapicons/icon_youarehere.png');
    this.load.image('icon_burn', '/images/mapicons/icon_burn.png');
    this.load.image('icon_death', '/images/mapicons/icon_death.png');
    this.load.image('icon_fight', '/images/mapicons/icon_fight.png');
  }

  create(): void {
    // Create map background centered
    this.mapImage = this.add.image(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'wagdiemap');
    this.mapImage.setOrigin(0.5, 0.5);

    // Set up camera
    const camera = this.cameras.main;
    camera.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    camera.setZoom(DEFAULT_ZOOM);
    camera.centerOn(MAP_WIDTH / 2, MAP_HEIGHT / 2);

    this.tooltipController = new TooltipController(this);
    this.markerManager = new MapMarkerManager({
      scene: this,
      getEditorMode: () => this.editorMode,
      getLayerVisibility: () => this.layerVisibility,
      onMarkerHover: (data) => this.onMarkerHover(data),
      onMarkerOut: (data) => this.onMarkerOut(data),
      onMarkerClick: (data) => this.onMarkerClick(data),
      onBeginLocationDrag: (marker, markerId) => {
        this.interaction = {
          kind: 'dragging-marker',
          marker,
          markerId,
        };
      },
    });

    // Set up input handlers
    this.setupInputHandlers();

    const handlers: MapSceneEventHandlers = {
      setLayerVisibility: (layers: Partial<LayerVisibility>) => {
        Object.entries(layers).forEach(([key, visible]) => {
          this.layerVisibility[key as keyof LayerVisibility] = visible as boolean;
        });
        this.markerManager?.updateMarkerVisibility();
      },
      flyToLocation: (data: FlyToPayload) => {
        this.flyTo(data.x * COORD_SCALE, data.y * COORD_SCALE, data.zoom);
      },
      updateLocations: (locations: MapLocationData[]) => {
        this.updateLocations(locations);
      },
      updateCharacters: (characters: MapCharacterData[]) => {
        this.updateCharacters(characters);
      },
      updateEvents: (events: MapEventsData) => {
        this.updateEvents(events);
      },
      editorModeChanged: (data: { mode: EditorMode }) => {
        this.editorMode = data.mode;
        this.markerManager?.updateMarkerDraggability();
      },
      locationDeleted: (data: { id: string }) => {
        this.markerManager?.removeLocation(data.id);
      },
    };

    this.unbindEventBusListeners = bindMapSceneEvents(this, handlers);

    // Ensure we always remove EventBus listeners when the scene is torn down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupEventBusListeners, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupEventBusListeners, this);

    // Notify React that scene is ready
    EventBus.emit(MapEvents.SCENE_READY, this);
    EventBus.emit(MapEvents.MAP_READY, {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      zoom: camera.zoom,
    });
  }

  private setupInputHandlers(): void {
    const camera = this.cameras.main;

    this.setupWheelZoomHandlers(camera);
    this.setupPointerInteractionHandlers(camera);
    this.setupPointerUpHandlers(camera);
    this.setupPinchZoomHandlers(camera);
  }

  private setupWheelZoomHandlers(camera: Phaser.Cameras.Scene2D.Camera): void {
    // Mouse wheel zoom
    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        const oldZoom = camera.zoom;
        const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Phaser.Math.Clamp(oldZoom + zoomDelta, MIN_ZOOM, MAX_ZOOM);

        if (newZoom !== oldZoom) {
          // Calculate the scroll adjustment to keep the point under the cursor static
          // Formula: scroll += (pointerPos - centerPos) * (1/oldZoom - 1/newZoom)
          const centerX = camera.width / 2;
          const centerY = camera.height / 2;

          camera.scrollX += (pointer.x - centerX) * (1 / oldZoom - 1 / newZoom);
          camera.scrollY += (pointer.y - centerY) * (1 / oldZoom - 1 / newZoom);

          camera.setZoom(newZoom);

          this.emitCameraChanged();
        }
      }
    );
  }

  private setupPointerInteractionHandlers(camera: Phaser.Cameras.Scene2D.Camera): void {
    // Pointer down: create-mode click OR begin panning (marker drag is initiated from marker pointerdown)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;

      // Create mode: always emit MAP_CLICKED (behavior preserved)
      if (this.editorMode === 'create') {
        const coords = this.getMapCoordsFromPointer(pointer, camera);
        EventBus.emit(MapEvents.MAP_CLICKED, coords);
        return;
      }

      // If a marker drag was initiated by a marker's pointerdown, do not start panning.
      if (this.interaction.kind === 'dragging-marker') {
        return;
      }

      // Begin camera panning (only if idle)
      this.interaction = {
        kind: 'panning',
        dragStartX: pointer.x,
        dragStartY: pointer.y,
        cameraStartX: camera.scrollX,
        cameraStartY: camera.scrollY,
      };
    });

    // Pointer move: drag marker OR pan camera
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.interaction.kind === 'dragging-marker') {
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        this.interaction.marker.setPosition(worldPoint.x, worldPoint.y);
        return;
      }

      if (this.interaction.kind === 'panning') {
        const dx = (this.interaction.dragStartX - pointer.x) / camera.zoom;
        const dy = (this.interaction.dragStartY - pointer.y) / camera.zoom;
        camera.scrollX = this.interaction.cameraStartX + dx;
        camera.scrollY = this.interaction.cameraStartY + dy;
      }
    });
  }

  private setupPointerUpHandlers(camera: Phaser.Cameras.Scene2D.Camera): void {
    // Pointer up: finish marker drag OR finish panning
    this.input.on('pointerup', () => {
      if (this.interaction.kind === 'dragging-marker') {
        const worldPoint = camera.getWorldPoint(
          this.input.activePointer.x,
          this.input.activePointer.y
        );

        // Convert back to 0-1000 coordinate system
        const x = worldPoint.x / COORD_SCALE;
        const y = worldPoint.y / COORD_SCALE;

        // Emit marker dragged event to React (domain id, behavior preserved)
        EventBus.emit(MapEvents.MARKER_DRAGGED, {
          id: this.interaction.markerId.replace('location-', ''),
          x,
          y,
        });

        // Always clear interaction so camera pan cannot remain "stuck"
        this.interaction = { kind: 'idle' };
        return;
      }

      if (this.interaction.kind === 'panning') {
        this.interaction = { kind: 'idle' };
        this.emitCameraChanged();
      }
    });

    // Pointer up outside: cancel marker drag (restore position) OR finish panning
    this.input.on('pointerupoutside', () => {
      if (this.interaction.kind === 'dragging-marker') {
        // Restore original position from stored marker data (behavior preserved)
        const data = this.markerManager?.getMarkerData(this.interaction.markerId);
        if (data) {
          this.interaction.marker.setPosition(data.x, data.y);
        }

        this.interaction = { kind: 'idle' };
        return;
      }

      if (this.interaction.kind === 'panning') {
        this.interaction = { kind: 'idle' };
        this.emitCameraChanged();
      }
    });
  }

  private setupPinchZoomHandlers(camera: Phaser.Cameras.Scene2D.Camera): void {
    // Pinch zoom for touch devices (behavior unchanged)
    this.input.on(
      'pinch',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObject: Phaser.GameObjects.GameObject | null,
        _startDistance: number,
        _distance: number,
        scaleFactor: number
      ) => {
        const newZoom = Phaser.Math.Clamp(camera.zoom * scaleFactor, MIN_ZOOM, MAX_ZOOM);
        camera.zoom = newZoom;
        this.emitCameraChanged();
      }
    );
  }

  private getMapCoordsFromPointer(
    pointer: Phaser.Input.Pointer,
    camera: Phaser.Cameras.Scene2D.Camera
  ): { x: number; y: number } {
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const x = worldPoint.x / COORD_SCALE;
    const y = worldPoint.y / COORD_SCALE;
    return { x, y };
  }

  private emitCameraChanged(): void {
    const camera = this.cameras.main;
    EventBus.emit(MapEvents.CAMERA_CHANGED, {
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      zoom: camera.zoom,
    });
  }

  /**
   * Fly camera to a specific position with animation
   */
  public flyTo(x: number, y: number, zoom?: number): void {
    const camera = this.cameras?.main;
    if (!camera) return;
    const duration = 500;

    camera.pan(x, y, duration, 'Power2');
    if (zoom !== undefined) {
      camera.zoomTo(zoom, duration, 'Power2');
    }
  }

  /**
   * Add or update location markers
   */
  public updateLocations(locations: MapLocationData[]): void {
    this.markerManager?.updateLocations(locations);
  }

  /**
   * Add or update character markers
   */
  public updateCharacters(characters: MapCharacterData[]): void {
    this.markerManager?.updateCharacters(characters);
  }

  /**
   * Add or update event markers (burns, deaths, fights)
   * Reconciles with existing markers to remove stale entries
   */
  public updateEvents(events: MapEventsData): void {
    this.markerManager?.updateEvents(events);
  }

  private onMarkerHover(data: MarkerData): void {
    const pointer = this.input.activePointer;
    this.tooltipController?.show(data.name, pointer.x, pointer.y);

    // Emit event to React
    EventBus.emit(MapEvents.MARKER_HOVERED, data);
  }

  private onMarkerOut(_data: MarkerData): void {
    this.tooltipController?.hide();
    EventBus.emit(MapEvents.MARKER_UNHOVERED);
  }

  private onMarkerClick(data: MarkerData): void {
    // Emit event to React
    EventBus.emit(MapEvents.MARKER_CLICKED, data);

    // Fly to marker
    this.flyTo(data.x, data.y, 1.5);
  }

  update(): void {
    // Update tooltip position to follow mouse
    if (this.tooltipController?.isVisible()) {
      const pointer = this.input.activePointer;
      this.tooltipController.updatePosition(pointer.x, pointer.y);
    }
  }

  private cleanupEventBusListeners(): void {
    if (this.unbindEventBusListeners) {
      this.unbindEventBusListeners();
      this.unbindEventBusListeners = null;
    }
  }
}
