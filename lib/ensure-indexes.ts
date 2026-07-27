import mongoose from 'mongoose';

/**
 * Ensure compound indexes exist for common query patterns.
 * Runs once on first DB connection (non-blocking).
 */
export async function ensureIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;

  await Promise.all([
    // Nominee: compound for filtered list queries (nominees-data endpoint)
    db.collection('nominees').createIndex(
      { awardId: 1, categoryId: 1, nominationStatus: 1, createdAt: -1 },
      { background: true }
    ),
    // Nominee: simple awardId prefix for fast countDocuments (no category/status filter)
    db.collection('nominees').createIndex(
      { awardId: 1, createdAt: -1 },
      { background: true }
    ),
    // Nominee: name text search within an award
    db.collection('nominees').createIndex(
      { awardId: 1, name: 1 },
      { background: true }
    ),
    // Category: queried by awardId with order sort
    db.collection('categories').createIndex(
      { awardId: 1, order: 1, createdAt: -1 },
      { background: true }
    ),
    // Vote: dashboard aggregation filter
    db.collection('votes').createIndex(
      { awardId: 1, paymentStatus: 1, createdAt: -1 },
      { background: true }
    ),
    // Vote: nominee-level aggregation (results page)
    db.collection('votes').createIndex(
      { awardId: 1, nomineeId: 1 },
      { background: true }
    ),
    // Payment: dashboard aggregation filter
    db.collection('payments').createIndex(
      { awardId: 1, status: 1, createdAt: -1 },
      { background: true }
    ),
    // Award: org lookup for access checks and listing
    db.collection('awards').createIndex(
      { organizationId: 1, createdAt: -1 },
      { background: true }
    ),
    // Award: access check for org-admin (assigned awards by _id)
    db.collection('awards').createIndex(
      { _id: 1, organizationId: 1 },
      { background: true }
    ),
    // Stage: queried by awardId
    db.collection('stages').createIndex(
      { awardId: 1, order: 1 },
      { background: true }
    ),
  ]).catch(() => {});
}
