import { create } from 'zustand';
import { defaultCamera, type Camera, type Viewport } from '../map/camera';

interface ViewStore {
  /** Aktueller Kartenausschnitt im Fenster der Übungsleitung. */
  readonly camera: Camera;
  /** Größe des Kartenfensters – nötig, um den Ausschnitt auf den Beamer zu übertragen. */
  readonly viewport: Viewport;
  readonly setView: (camera: Camera, viewport: Viewport) => void;
}

/** Ausschnitt der Karte – reine Oberfläche, gehört nicht zum Spielstand. */
export const useViewStore = create<ViewStore>()((set) => ({
  camera: defaultCamera,
  viewport: { width: 0, height: 0 },
  setView: (camera, viewport) => set({ camera, viewport }),
}));
