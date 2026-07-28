import connectDB from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

interface AuditActor {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Records an audit trail entry. Never throws — a logging failure must not
 * break the action it's recording, so callers can fire-and-forget or await
 * without wrapping this in their own try/catch.
 */
export async function logAudit(params: {
  actor: AuditActor;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: params.actor.id,
      actorEmail: params.actor.email || 'unknown',
      actorRole: params.actor.role || 'unknown',
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
