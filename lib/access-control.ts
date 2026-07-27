import Award from '@/models/Award';


export async function hasAwardAccess(
  userId: string,
  userRole: string,
  awardId: string,
  assignedAwards?: string[]
): Promise<boolean> {
  try {
    if (userRole === 'organization') {
      // Use lean + select for minimal overhead
      const award = await Award.findOne({
        _id: awardId,
        organizationId: userId,
      }).select('_id').lean();
      return !!award;
    }

    // Org-admins only have access to assigned awards
    if (userRole === 'org-admin') {
      if (!assignedAwards || assignedAwards.length === 0) {
        return false;
      }
      return assignedAwards.includes(awardId);
    }

    return false;
  } catch (error) {
    return false;
  }
}

export function getAwardAccessQuery(
  userId: string,
  userRole: string,
  assignedAwards?: string[]
): any {
  if (userRole === 'organization') {
    return { organizationId: userId };
  }

  if (userRole === 'org-admin') {
    if (!assignedAwards || assignedAwards.length === 0) {
      return { _id: { $in: [] } }; // Return empty result
    }
    return { _id: { $in: assignedAwards } };
  }

  return { _id: { $in: [] } }; // Return empty result for unknown roles
}
