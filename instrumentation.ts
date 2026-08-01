export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduledVoterCredentialsJob } = await import('@/lib/scheduledVoterCredentials');
    startScheduledVoterCredentialsJob();

    const { startScheduledVoterExpiryJob } = await import('@/lib/scheduledVoterExpiry');
    startScheduledVoterExpiryJob();
  }
}
