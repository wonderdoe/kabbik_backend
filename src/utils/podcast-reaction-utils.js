const REACTION_LIKE = 'like';
const REACTION_DISLIKE = 'dislike';

const computeReactionTransition = (existing, target) => {
  if (!existing) {
    return {
      action: 'insert',
      likeDelta: target === REACTION_LIKE ? 1 : 0,
      dislikeDelta: target === REACTION_DISLIKE ? 1 : 0,
      userReaction: target,
    };
  }

  if (existing === target) {
    return {
      action: 'delete',
      likeDelta: target === REACTION_LIKE ? -1 : 0,
      dislikeDelta: target === REACTION_DISLIKE ? -1 : 0,
      userReaction: null,
    };
  }

  return {
    action: 'update',
    likeDelta: target === REACTION_LIKE ? 1 : -1,
    dislikeDelta: target === REACTION_DISLIKE ? 1 : -1,
    userReaction: target,
  };
};

const applyPremiumAccess = (row, currentUser) => {
  if (row.is_premium && currentUser.is_subscribed !== 1) {
    return { ...row, podcast_url: null };
  }
  return row;
};

module.exports = {
  REACTION_LIKE,
  REACTION_DISLIKE,
  computeReactionTransition,
  applyPremiumAccess,
};
