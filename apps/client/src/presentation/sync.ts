import { presentationState, type ClockAnchor, type GameState } from '@tds/engine';
import type { Camera, Viewport } from '../map/camera';
import { useGameStore } from '../store/gameStore';
import { useViewStore } from '../store/viewStore';

// Verbindung zwischen dem Fenster der Übungsleitung und dem Beamer-Fenster.
// Beide laufen im selben Browser, daher genügt ein BroadcastChannel – kein Server nötig.
// Die Übungsleitung ist die Quelle der Wahrheit; der Beamer zeigt nur an.

const CHANNEL_NAME = 'topdownsimulator-presentation';

export type SyncMessage =
  /** Beamer-Fenster ist (neu) geöffnet und bittet um den aktuellen Stand. */
  | { readonly type: 'hello' }
  /** Lage und Uhr – bereits gefiltert auf das, was die Übenden sehen dürfen. */
  | { readonly type: 'exercise'; readonly state: GameState; readonly clock: ClockAnchor }
  /** Kartenausschnitt der Übungsleitung samt Fenstergröße, damit der Beamer ihn einpassen kann. */
  | { readonly type: 'camera'; readonly camera: Camera; readonly viewport: Viewport }
  /** Fenster der Übungsleitung wird geschlossen oder neu geladen. */
  | { readonly type: 'bye' };

/**
 * Startet die Übertragung im Fenster der Übungsleitung: sendet bei jeder Änderung von Lage, Uhr
 * und Ausschnitt und beantwortet Anfragen neu geöffneter Beamer-Fenster.
 * Gibt eine Funktion zurück, die alles wieder beendet.
 */
export function startDirectorSync(): () => void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const post = (message: SyncMessage) => channel.postMessage(message);

  const sendExercise = () => {
    const { state, clock } = useGameStore.getState();
    post({ type: 'exercise', state: presentationState(state), clock });
  };
  const sendCamera = () => {
    const { camera, viewport } = useViewStore.getState();
    post({ type: 'camera', camera, viewport });
  };

  channel.onmessage = (e: MessageEvent<SyncMessage>) => {
    if (e.data.type === 'hello') {
      sendExercise();
      sendCamera();
    }
  };
  const unsubscribeGame = useGameStore.subscribe(sendExercise);
  const unsubscribeView = useViewStore.subscribe(sendCamera);
  const onUnload = () => post({ type: 'bye' });
  window.addEventListener('pagehide', onUnload);

  // Falls schon ein Beamer-Fenster offen ist (z. B. nach Neuladen), gleich den Stand schicken.
  sendExercise();
  sendCamera();

  return () => {
    unsubscribeGame();
    unsubscribeView();
    window.removeEventListener('pagehide', onUnload);
    channel.close();
  };
}

/** Verbindet ein Beamer-Fenster: meldet sich an und reicht eingehende Nachrichten weiter. */
export function connectPresentation(onMessage: (message: SyncMessage) => void): () => void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<SyncMessage>) => onMessage(e.data);
  channel.postMessage({ type: 'hello' } satisfies SyncMessage);
  return () => channel.close();
}

/** Öffnet das Beamer-Fenster bzw. holt es nach vorn, wenn es schon offen ist. */
export function openPresentationWindow(): void {
  const url = new URL(window.location.href);
  url.search = '?view=presentation';
  window.open(url, 'topdownsimulator-presentation', 'popup,width=1280,height=720');
}
