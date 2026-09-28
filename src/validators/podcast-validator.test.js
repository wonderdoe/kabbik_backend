const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const PodcastValidator = require('./podcast-validator');

const validThumbUrl = 'https://cdn.example.com/ep-thumb.jpg';
const validCreateBody = {
  title: 'Episode title',
  podcast_url: 'https://cdn.example.com/ep.mp3',
  thumb_url: validThumbUrl,
};

const runValidators = async (validators, { body = {}, params = {} } = {}) => {
  const req = { body, params, query: {} };
  await Promise.all(validators.map((validator) => validator.run(req)));
  return validationResult(req);
};

test('validateCreatePodcast accepts body without tags', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: validCreateBody,
  });

  assert.equal(result.isEmpty(), true);
});

test('validateCreatePodcast accepts null tags', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      tags: null,
    },
  });

  assert.equal(result.isEmpty(), true);
});

test('validateListQuery accepts missing tag filter', async () => {
  const req = { body: {}, params: {}, query: { page: '1', limit: '10' } };
  await Promise.all(PodcastValidator.validateListQuery().map((validator) => validator.run(req)));
  const result = validationResult(req);

  assert.equal(result.isEmpty(), true);
});

test('validateListQuery treats empty tag filter as omitted', async () => {
  const req = { body: {}, params: {}, query: { tag: '   ' } };
  await Promise.all(PodcastValidator.validateListQuery().map((validator) => validator.run(req)));
  const result = validationResult(req);

  assert.equal(result.isEmpty(), true);
});

test('validateCreatePodcast rejects missing title', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      podcast_url: validCreateBody.podcast_url,
      thumb_url: validCreateBody.thumb_url,
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /title/i);
});

test('validateCreatePodcast rejects missing podcast_url', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      title: validCreateBody.title,
      thumb_url: validCreateBody.thumb_url,
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /podcast_url/i);
});

test('validateCreatePodcast rejects missing thumb_url', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      title: validCreateBody.title,
      podcast_url: validCreateBody.podcast_url,
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /thumb_url/i);
});

test('validateCreatePodcast rejects empty thumb_url', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      thumb_url: '   ',
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /thumb_url/i);
});

test('validateCreatePodcast rejects invalid thumb_url', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      thumb_url: 'not-a-url',
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /valid URL/i);
});

test('validateCreatePodcast rejects invalid podcast_url', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      podcast_url: 'not-a-url',
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /valid URL/i);
});

test('validateCreatePodcast rejects more than 20 tags', async () => {
  const tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`);

  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      tags,
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /at most 20/i);
});

test('validateCreatePodcast rejects empty tag string', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      tags: ['valid', '   '],
    },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /non-empty string/i);
});

test('validateCreatePodcast accepts valid body', async () => {
  const result = await runValidators(PodcastValidator.validateCreatePodcast(), {
    body: {
      ...validCreateBody,
      description: 'Description',
      is_premium: false,
      tags: ['comedy', 'tech'],
    },
  });

  assert.equal(result.isEmpty(), true);
});

test('validateUpdatePodcast accepts partial body', async () => {
  const result = await runValidators(PodcastValidator.validateUpdatePodcast(), {
    body: { title: 'Updated title' },
  });

  assert.equal(result.isEmpty(), true);
});

test('validateUpdatePodcast rejects invalid podcast_url when provided', async () => {
  const result = await runValidators(PodcastValidator.validateUpdatePodcast(), {
    body: { podcast_url: 'bad-url' },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /valid URL/i);
});

test('validateUpdatePodcast accepts omitted thumb_url', async () => {
  const result = await runValidators(PodcastValidator.validateUpdatePodcast(), {
    body: { title: 'Updated title' },
  });

  assert.equal(result.isEmpty(), true);
});

test('validateUpdatePodcast rejects empty thumb_url when provided', async () => {
  const result = await runValidators(PodcastValidator.validateUpdatePodcast(), {
    body: { thumb_url: '   ' },
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /must not be empty/i);
});

test('validateUpdatePodcast accepts valid thumb_url when provided', async () => {
  const result = await runValidators(PodcastValidator.validateUpdatePodcast(), {
    body: { thumb_url: validThumbUrl },
  });

  assert.equal(result.isEmpty(), true);
});

const runQueryValidators = async (validators, query = {}) => {
  const req = { body: {}, params: {}, query };
  await Promise.all(validators.map((validator) => validator.run(req)));
  return validationResult(req);
};

test('validateSearchQuery rejects missing q', async () => {
  const result = await runQueryValidators(PodcastValidator.validateSearchQuery(), {});

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /"q" is required/i);
});

test('validateSearchQuery rejects whitespace-only q', async () => {
  const result = await runQueryValidators(PodcastValidator.validateSearchQuery(), { q: '   ' });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /"q" is required/i);
});

test('validateSearchQuery rejects q longer than 200 characters', async () => {
  const result = await runQueryValidators(PodcastValidator.validateSearchQuery(), {
    q: 'a'.repeat(201),
  });

  assert.equal(result.isEmpty(), false);
  assert.match(result.array().map((e) => e.msg).join(', '), /Query too long/i);
});

test('validateSearchQuery accepts valid q with page and limit', async () => {
  const validators = [
    ...PodcastValidator.validateSearchQuery(),
    ...PodcastValidator.validateListQuery(),
  ];
  const result = await runQueryValidators(validators, {
    q: 'habits',
    page: '1',
    limit: '10',
  });

  assert.equal(result.isEmpty(), true);
});
