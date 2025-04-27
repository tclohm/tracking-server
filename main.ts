import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PostgreSQLClient } from '@hono/postgresql'

//const sampleTrackingEvent = {
//  // Core event data
//  eventId: "e12345-abcde-67890", // Unique identifier
//  userId: "u-a9b8c7d6",          // Anonymous or authenticated user ID
//  sessionId: "s-1a2b3c4d5e",     // Browser session ID
//  timestamp: 1714175283921,      // Unix timestamp in milliseconds
//  eventType: "click",            // click, hover, pageview, scroll, etc.
//
//  // Page context
//  url: "https://example.com/products/123",
//  referrer: "https://example.com/category/456",
//  pageTitle: "Product XYZ | Example.com",
//
//  // Event details
//  target: {
//    elementType: "button",       // button, a, div, etc.
//    elementId: "add-to-cart",
//    elementClass: "btn primary-action",
//    elementText: "Add to Cart",
//  },
//
//  // Positional data (for heatmaps)
//  position: {
//    x: 723,                      // x-coordinate relative to viewport
//    y: 485,                      // y-coordinate relative to viewport
//    viewportWidth: 1280,         // viewport dimensions for normalization
//    viewportHeight: 800,
//    scrollX: 0,                  // scroll offset
//    scrollY: 320,
//  },
//
//  // Device info
//  device: {
//    type: "desktop",             // desktop, mobile, tablet
//    browser: "Chrome",
//    browserVersion: "106.0.5249.119",
//    os: "Windows",
//    osVersion: "11",
//    screenSize: "1920x1080"
//  },
//
//  // Custom metadata
//  metadata: {
//    // Additional app-specific data
//    productId: "prod-123",
//    categoryId: "cat-456",
//    isLoggedIn: true,
//    userTier: "premium"
//  }
//};
//

const app = new Hono();

app.use('*', cors({
  origin: ['localhost:5432'],
  allowedMethods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400, // 24 hours
}));

const db = new PostgreSQLClient({
  connectionString: process.env.DATABASE_URL
});

app.use('*', db.middleware())

// Event Tracking Endpoint
app.post('/api/track', async (c) => {
  try {
    const body = await c.req.json()
    // Extract tracking data from request
    const events = Array.isArray(body) ? body : [body];
    // Validate and sanitize data
    const validEvents = events.fitler(events =>
                                     event.eventType &&
                                     event.timestamp &&
                                     event.sessionId)

    if (validatedEvents.length === 0) {
      return c.json({ error: 'No valid events provided' }, 400);
    }

    const result = await Promise.all(validEvents.map(event => 
                                                    storeEvent(c.var.db, event)))
    return c.json({ 
      success: true, 
      count: results.length
    }, 200)
  } catch (error) {
    console.error('Error processing tracking events:', error)
    return c.json({ error: 'Failed to process events' }, 500)
  }
})

// Store single event in db
async function storeEvent(db, events) {
    const query = `
    INSERT INTO tracking_events(
      event_id, user_id, session_id, timestamp, event_type, 
      url, target_data, position_data, device_data, metadata
    ) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
    `;

    const result = await db.query(query, [
      event.eventId,
      event.userId,
      event.sessionId,
      new Date(event.timestamp),
      event.eventType,
      event.url,
      JSON.stringify(event.target || {}),
      JSON.stringify(event.position || {}),
      JSON.stringify(event.device || {}),
      JSON.stringify(event.metadata || {})
    ])

    return result.rows[0]
}


// Analytics Endpoint
app.get('/api/analytics/heatmap', async (c) => {
  const { url, days = 7 } = c.req.query()

  if (!url) {
    return c.json({ error: 'URL parameter is required' }, 400)
  }

  const query = `
    SELECT
      position_data->>'x' as x,
      position_data->>'y' as y,
      event_type,
      COUNT(*) as count
    FROM user_events
    WHERE
      url = $1
      AND timestamp > NOW() - INTERVAL '1 day' * $2
      AND event_type IN ('click', 'hover')
      AND position_data IS NOT NULL
    GROUP BY position_data->>'x', position_data->>'y', event_type
  `

  const result = await c.var.db.query(query, [url, parseInt(days)])

  return c.json(result.rows)
})

Deno.serve(app.fetch)
