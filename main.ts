import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { getCookie, setCookie } from 'hono/cookie';

const sampleTrackingEvent = {
  // Core event data
  eventId: "e12345-abcde-67890", // Unique identifier
  userId: "u-a9b8c7d6",          // Anonymous or authenticated user ID
  sessionId: "s-1a2b3c4d5e",     // Browser session ID
  timestamp: 1714175283921,      // Unix timestamp in milliseconds
  eventType: "click",            // click, hover, pageview, scroll, etc.
  
  // Page context
  url: "https://example.com/products/123",
  referrer: "https://example.com/category/456",
  pageTitle: "Product XYZ | Example.com",
  
  // Event details
  target: {
    elementType: "button",       // button, a, div, etc.
    elementId: "add-to-cart",
    elementClass: "btn primary-action",
    elementText: "Add to Cart",
  },
  
  // Positional data (for heatmaps)
  position: {
    x: 723,                      // x-coordinate relative to viewport
    y: 485,                      // y-coordinate relative to viewport
    viewportWidth: 1280,         // viewport dimensions for normalization
    viewportHeight: 800,
    scrollX: 0,                  // scroll offset
    scrollY: 320,
  },
  
  // Device info
  device: {
    type: "desktop",             // desktop, mobile, tablet
    browser: "Chrome",
    browserVersion: "106.0.5249.119",
    os: "Windows",
    osVersion: "11",
    screenSize: "1920x1080"
  },
  
  // Custom metadata
  metadata: {
    // Additional app-specific data
    productId: "prod-123",
    categoryId: "cat-456",
    isLoggedIn: true,
    userTier: "premium"
  }
};


const app = new Hono();

app.post('/api/track', async (c) => {
  try {
    // Extract tracking data from request
    const events = Array.isArray(c.req.body) ? c.req.body : [c.req.body];
    // Validate and sanitize data
    const validatedEvents = events.filter(event => {
      if (!event.eventType || !event.timestamp) {
        return false;
      }

      if (event.target && event.target.elementText) {
        event.target.elementText = sanitizeHtml(event.target.elementText);
      }

      return true;
    });

    if (validatedEvents.length === 0) {
      return c.json({ error: 'No valid events provided' }, 400);
    }

    // Store in database
    await storeTrackingEvents(validatedEvents);

    // Push to real-time stream if needed
    validatedEvents.forEach(event => {
      publishToRealtimeStream(event);
    });

    return c.json({ success: }, 200)
  }
})

async function storeTrackingEvents(events) {
  const values = events.map(event => [
    events.eventId,
    event.userId,
    event.sessionId,
    new Date(event.timestamp),
    event.eventType,
    event.url,
    JSON.stringify(event.target),
    JSON.stringify(event.position),
    JSON.stringify(event.device),
    JSON.stringify(event.metadata)
  ]);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const queryText = `
    INSERT INTO tracking_events(
      event_id, user_id, session_id, timestamp, event_type, url, target_data, position_data, device_data, metadata) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
    for (const value of values) {
      await client.query(queryText, value);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function publishToRealtimeStream(event) {
  // OPTIONS: 
  //  1) Redis Pub/Sub
  //  2) Websockets
  //  3) Kafka
}

async function purgeOldTrackingData() {
  // Delete individual event data older than retention period
}

Deno.serve(app.fetch)
