import { Temporal } from '@js-temporal/polyfill';
import {
  toEasternIso,
  toTemporalInstant,
} from './easternTime.js';

// omits publish_at on an unlocked write so the server stamps the publish time itself, not the client's clock
export function buildPublicationPayload(formData, now = new Date()) {
  if (!formData?.publishDate) {
    return {
      publish_at: null,
      is_locked: Boolean(formData?.isLocked),
    };
  }

  const publishAt = toEasternIso(
    formData.publishDate,
    formData.publishTime || '00:00'
  );
  if (!publishAt) return null;
  return {
    publish_at: publishAt,
    is_locked: Temporal.Instant.compare(
      toTemporalInstant(publishAt),
      toTemporalInstant(now)
    ) > 0,
  };
}

// projects effective publication state and fails closed on invalid times
export function projectPublicationState(record, now = new Date()) {
  const publishAt = record?.publishAt ?? null;
  let isLocked = Boolean(record?.isLocked);

  if (publishAt) {
    try {
      isLocked = Temporal.Instant.compare(
        toTemporalInstant(publishAt),
        toTemporalInstant(now)
      ) > 0;
    } catch {
      isLocked = true;
    }
  }

  return {
    ...record,
    publishAt,
    isLocked,
    isPublished: !isLocked,
  };
}
