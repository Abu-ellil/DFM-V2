import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * GET /api/sync/status
 *
 * Health check endpoint for the sync API
 *
 * Response:
 * {
 *   status: 'ok',
 *   timestamp: string,
 *   version: string
 * }
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  try {
    return response.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'dates-factory-manager-sync-api'
    })
  } catch (error: any) {
    return response.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
}
