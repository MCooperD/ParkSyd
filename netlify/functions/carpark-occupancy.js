// netlify-tfnsw-proxy-example.js
//
// WHY THIS EXISTS
// TfNSW's own docs say API calls should be proxied through your own server —
// calling their API directly from a webpage would expose your API key to
// anyone who opens dev tools, and isn't guaranteed to work due to CORS.
// This is a small serverless function that sits between your app and TfNSW:
// your page calls THIS function, and this function calls TfNSW using a key
// that only exists on the server, never in the browser.
//
// WHAT CHANGED FROM THE FIRST VERSION:
// The base endpoint (GET /v1/carpark) only returns a list of facility IDs
// and names — not actual occupancy. To get real spot counts you have to
// call it again per facility (GET /v1/carpark?facility=ID). This version
// fetches the full list, then fetches every facility's live occupancy in
// parallel, and returns one combined array ready for the map to use.

exports.handler = async function (event, context) {
  const API_KEY = process.env.TFNSW_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing TFNSW_API_KEY environment variable" }),
    };
  }

  const headers = {
    Authorization: `apikey ${API_KEY}`,
    Accept: "application/json",
  };

  try {
    // 1) Get the list of all facility IDs + names
    const listRes = await fetch("https://api.transport.nsw.gov.au/v1/carpark", { headers });
    if (!listRes.ok) {
      return { statusCode: listRes.status, body: JSON.stringify({ error: "Failed to fetch facility list" }) };
    }
    const facilities = await listRes.json(); // { "1": "Tallawong Station Car Park", ... }
    const ids = Object.keys(facilities);

    // 2) Fetch occupancy for every facility in parallel
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`https://api.transport.nsw.gov.au/v1/carpark?facility=${id}`, { headers });
          if (!res.ok) return null;
          const data = await res.json();
          return {
            facility_id: id,
            name: facilities[id],
            spots: data.spots || null,
            zones: data.zones || null,
            occupancy: data.occupancy || null,
            message_date: data.MessageDate || data.message_date || null,
          };
        } catch (err) {
          return null;
        }
      })
    );

    const merged = results.filter(Boolean);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(merged),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
