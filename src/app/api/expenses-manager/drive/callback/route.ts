/**
 * Drive OAuth callback — expenses-manager legacy URL.
 *
 * This route is kept as an alias for backward compatibility.
 * The canonical callback is now /api/drive/callback.
 *
 * ACTION REQUIRED: Add /api/drive/callback to your OAuth 2.0 Client's
 * Authorized redirect URIs in Google Cloud Console, then update GOOGLE_CLIENT_ID
 * redirect_uri references and remove this shim once confirmed working.
 *
 * Note: A redirect here won't work for OAuth callbacks (Google validates the
 * redirect_uri exactly). This file re-exports the platform callback handler
 * so both URLs remain functional until GCP is updated.
 */

export { GET } from '@/app/api/drive/callback/route'
