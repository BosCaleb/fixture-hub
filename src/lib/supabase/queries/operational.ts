/**
 * Operational query layer — re-exports existing functions from tournament-api.ts
 * that read/write the public schema. This file provides a clean import path
 * and houses any new operational-only queries.
 *
 * All write operations remain here on the public schema.
 */
export {
  fetchTournament,
  saveTournamentState,
  resetTournament,
  uploadTournamentLogo,
  ensureDefaultTournament,
  getSessionProfile,
  signIn,
  signUp,
  signOut,
  subscribeToAuthChanges,
  subscribeToTournamentRealtime,
} from '@/lib/tournament-api';
