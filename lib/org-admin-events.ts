import OrganizationAdmin from '@/models/OrganizationAdmin';

/**
 * Returns the list of event IDs that an org-admin is permitted to access.
 * If the admin has no membership record for the org, returns an empty array.
 */
export async function getOrgAdminEventIds(adminId: string, organizationId: string): Promise<string[]> {
  const adminDoc = await OrganizationAdmin.findById(adminId).select('organizations').lean();
  const membership = (adminDoc as any)?.organizations?.find(
    (o: any) => o.organizationId?.toString() === organizationId
  );
  return (membership?.assignedEvents || []).map((id: any) => id.toString());
}
