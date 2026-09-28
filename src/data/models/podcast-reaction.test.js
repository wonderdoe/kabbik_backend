const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeReactionTransition,
  applyPremiumAccess,
  REACTION_LIKE,
  REACTION_DISLIKE,
} = require('../../utils/podcast-reaction-utils');

test('none -> like inserts like and increments like_count', () => {
  const result = computeReactionTransition(null, REACTION_LIKE);
  assert.equal(result.action, 'insert');
  assert.equal(result.likeDelta, 1);
  assert.equal(result.dislikeDelta, 0);
  assert.equal(result.userReaction, REACTION_LIKE);
});

test('none -> dislike inserts dislike and increments dislike_count', () => {
  const result = computeReactionTransition(null, REACTION_DISLIKE);
  assert.equal(result.action, 'insert');
  assert.equal(result.likeDelta, 0);
  assert.equal(result.dislikeDelta, 1);
  assert.equal(result.userReaction, REACTION_DISLIKE);
});

test('like -> like toggles off', () => {
  const result = computeReactionTransition(REACTION_LIKE, REACTION_LIKE);
  assert.equal(result.action, 'delete');
  assert.equal(result.likeDelta, -1);
  assert.equal(result.dislikeDelta, 0);
  assert.equal(result.userReaction, null);
});

test('dislike -> dislike toggles off', () => {
  const result = computeReactionTransition(REACTION_DISLIKE, REACTION_DISLIKE);
  assert.equal(result.action, 'delete');
  assert.equal(result.likeDelta, 0);
  assert.equal(result.dislikeDelta, -1);
  assert.equal(result.userReaction, null);
});

test('like -> dislike switches reaction', () => {
  const result = computeReactionTransition(REACTION_LIKE, REACTION_DISLIKE);
  assert.equal(result.action, 'update');
  assert.equal(result.likeDelta, -1);
  assert.equal(result.dislikeDelta, 1);
  assert.equal(result.userReaction, REACTION_DISLIKE);
});

test('dislike -> like switches reaction', () => {
  const switchResult = computeReactionTransition(REACTION_DISLIKE, REACTION_LIKE);
  assert.equal(switchResult.action, 'update');
  assert.equal(switchResult.likeDelta, 1);
  assert.equal(switchResult.dislikeDelta, -1);
  assert.equal(switchResult.userReaction, REACTION_LIKE);
});

test('applyPremiumAccess nulls url for premium non-subscribers', () => {
  const row = {
    id: 1,
    is_premium: 1,
    podcast_url: 'https://example.com/ep.mp3',
  };

  const blocked = applyPremiumAccess(row, { is_subscribed: 0 });
  assert.equal(blocked.podcast_url, null);

  const allowed = applyPremiumAccess(row, { is_subscribed: 1 });
  assert.equal(allowed.podcast_url, 'https://example.com/ep.mp3');
});

test('applyPremiumAccess leaves non-premium urls intact', () => {
  const row = {
    id: 1,
    is_premium: 0,
    podcast_url: 'https://example.com/free.mp3',
  };

  const result = applyPremiumAccess(row, { is_subscribed: 0 });
  assert.equal(result.podcast_url, 'https://example.com/free.mp3');
});
