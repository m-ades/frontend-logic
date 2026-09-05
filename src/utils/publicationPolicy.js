import { Temporal } from '@js-temporal/polyfill';
import {
  toEasternIso,
  toTemporalInstant,
} from './easternTime.js';

/*
uses manual locks without a date and derives lock state from scheduled new york time
returns null for invalid wall times
*/
export function buildPublicationPayload(formData, now = new Date()) {
  if (!formData?.publishDate) {
    const isLocked = Boolean(formData?.isLocked);
    return {
      publish_at: isLocked ? null : toTemporalInstant(now).toString(),
      is_locked: isLocked,
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
