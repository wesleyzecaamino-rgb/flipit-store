export interface HeartBeatTransitionInput {
  prevProductId: string | null;
  nextProductId: string;
  prevSaved: boolean;
  nextSaved: boolean;
}

/**
 * Triggers the subtle heartbeat confirmation animation only when the currently
 * viewed product transitions from unsaved to saved. Opening a modal for an
 * already-saved product or removing a product does not trigger the animation.
 */
export function shouldTriggerHeartBeat(input: HeartBeatTransitionInput): boolean {
  if (input.prevProductId !== input.nextProductId) {
    return false;
  }
  return !input.prevSaved && input.nextSaved;
}
