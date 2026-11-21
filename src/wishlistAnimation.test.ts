import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldTriggerHeartBeat } from './wishlistAnimation';

test('shouldTriggerHeartBeat fires only when same product transitions from unsaved to saved', () => {
  assert.equal(
    shouldTriggerHeartBeat({
      prevProductId: 'orchid-funnel-zip',
      nextProductId: 'orchid-funnel-zip',
      prevSaved: false,
      nextSaved: true,
    }),
    true
  );

  // Removing from wishlist should not trigger heartbeat
  assert.equal(
    shouldTriggerHeartBeat({
      prevProductId: 'orchid-funnel-zip',
      nextProductId: 'orchid-funnel-zip',
      prevSaved: true,
      nextSaved: false,
    }),
    false
  );

  // Opening a modal for an already-saved product should not trigger heartbeat
  assert.equal(
    shouldTriggerHeartBeat({
      prevProductId: null,
      nextProductId: 'orchid-funnel-zip',
      prevSaved: false,
      nextSaved: true,
    }),
    false
  );

  // Switching to a different saved product should not trigger heartbeat
  assert.equal(
    shouldTriggerHeartBeat({
      prevProductId: 'orchid-funnel-zip',
      nextProductId: 'lilac-fleece-set',
      prevSaved: false,
      nextSaved: true,
    }),
    false
  );
});
