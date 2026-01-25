import { NextResponse } from 'next/server'

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
export const config = {
  runtime: 'edge',
  maxDuration: 10
}

export async function GET() {
  try {
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'dates-factory-manager-sync-api'
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      {
        status: 500
      }
    )
  }
}
