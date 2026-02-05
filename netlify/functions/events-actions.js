const axios = require('axios');

const INTERNAL_ADMIN_URL = 'https://internal-admin.pubnub.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { keyid, token, accountid, appid, subscribekey } = event.queryStringParameters || {};

  if (!keyid || !token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing keyid or token' }),
    };
  }

  const headers = { 'X-Session-Token': token };

  // Try multiple API endpoints as the Events & Actions API structure varies
  // Events & Actions in PubNub are part of the "Event Handlers" or "Blocks" system
  const endpoints = [
    // Primary: Event Handlers API endpoints
    `${INTERNAL_ADMIN_URL}/api/v1/blocks/key/${keyid}/event_handler`,
    `${INTERNAL_ADMIN_URL}/api/v3/blocks/key/${keyid}/event_handler`,
    // With subscribe key (more common pattern)
    subscribekey ? `${INTERNAL_ADMIN_URL}/api/v1/blocks/sub-key/${subscribekey}/event_handler` : null,
    subscribekey ? `${INTERNAL_ADMIN_URL}/api/v3/blocks/sub-key/${subscribekey}/event_handler` : null,
    // Event handlers list
    subscribekey ? `${INTERNAL_ADMIN_URL}/api/v1/blocks/sub-key/${subscribekey}` : null,
    // Alternative endpoints
    `${INTERNAL_ADMIN_URL}/api/event-handlers/key/${keyid}`,
    `${INTERNAL_ADMIN_URL}/api/events-actions/key/${keyid}`,
    // App-level event handlers
    appid ? `${INTERNAL_ADMIN_URL}/api/v1/blocks/app/${appid}/event_handler` : null,
  ].filter(Boolean);

  console.log(`[events-actions] Trying ${endpoints.length} endpoints for key ${keyid}, subscribekey: ${subscribekey?.substring(0, 20)}...`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`[events-actions] Trying: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers,
        timeout: 10000,
      });

      const responseData = JSON.stringify(response.data).substring(0, 1000);
      console.log(`[events-actions] SUCCESS ${response.status} from ${endpoint}`);
      console.log(`[events-actions] Response data: ${responseData}`);
      results.push({ endpoint, status: response.status, data: response.data });

      const data = response.data || {};
      
      // The API might return data in different formats
      // Format 1: { listeners: [], actions: [] }
      // Format 2: { payload: [...] } - event handlers / blocks
      // Format 3: { result: { listeners: [], actions: [] } }
      // Format 4: Array of event handlers directly
      // Format 5: Blocks format with event_handlers inside each block
      
      let listeners = [];
      let actions = [];

      // Helper to extract from blocks/event handlers
      const extractFromBlocks = (blocks) => {
        const extractedListeners = [];
        const extractedActions = [];
        
        for (const block of blocks) {
          // Each block might have event_handlers array
          const handlers = block.event_handlers || block.handlers || [];
          for (const handler of handlers) {
            // Listener/trigger info
            if (handler.name || handler.event || handler.channels) {
              extractedListeners.push({
                id: handler.id || block.id,
                name: handler.name || block.name,
                event: handler.event || handler.type || handler.channels,
                enabled: handler.status === 'running' || handler.status === 'on' || handler.enabled === true,
              });
            }
          }
          
          // Actions might be separate or part of the handler
          const blockActions = block.actions || [];
          for (const action of blockActions) {
            extractedActions.push({
              id: action.id,
              name: action.name,
              type: action.type || action.category,
              enabled: action.status === 'running' || action.status === 'on' || action.enabled === true,
            });
          }
          
          // If block itself looks like an event handler
          if (block.type === 'event_handler' || block.event_type || block.channels) {
            extractedListeners.push({
              id: block.id,
              name: block.name,
              event: block.event_type || block.type || block.channels,
              enabled: block.status === 'running' || block.status === 'on' || block.enabled === true,
            });
          }
        }
        
        return { listeners: extractedListeners, actions: extractedActions };
      };

      if (Array.isArray(data)) {
        // Direct array of event handlers/blocks
        const extracted = extractFromBlocks(data);
        listeners = extracted.listeners;
        actions = extracted.actions;
        
        // Fallback: if no structured data, treat items as listeners
        if (listeners.length === 0 && actions.length === 0 && data.length > 0) {
          listeners = data.map(item => ({
            id: item.id,
            name: item.name,
            event: item.event || item.type || item.event_type,
            enabled: item.status === 'running' || item.status === 'on' || item.enabled === true,
          }));
        }
      } else if (data.payload && Array.isArray(data.payload)) {
        // Wrapped in payload
        const extracted = extractFromBlocks(data.payload);
        listeners = extracted.listeners;
        actions = extracted.actions;
      } else if (data.result && Array.isArray(data.result)) {
        // Result is an array
        const extracted = extractFromBlocks(data.result);
        listeners = extracted.listeners;
        actions = extracted.actions;
      } else if (data.result) {
        // Wrapped in result object
        listeners = data.result.listeners || data.result.event_listeners || [];
        actions = data.result.actions || [];
      } else {
        // Standard format
        listeners = data.listeners || data.event_listeners || [];
        actions = data.actions || [];
      }

      // If we found any data, return it
      if (listeners.length > 0 || actions.length > 0) {
        console.log(`[events-actions] Found ${listeners.length} listeners, ${actions.length} actions`);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listeners, actions }),
        };
      }
    } catch (error) {
      const status = error.response?.status || 'N/A';
      const errorData = error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : error.message;
      console.log(`[events-actions] FAILED ${status} from ${endpoint}: ${errorData}`);
      // Continue to next endpoint
    }
  }

  // Log summary of what we found
  console.log(`[events-actions] Summary: ${results.length} successful responses out of ${endpoints.length} endpoints tried`);

  // No data found from any endpoint
  console.log(`[events-actions] Key ${keyid}: No events & actions found from any endpoint`);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listeners: [], actions: [] }),
  };
};
