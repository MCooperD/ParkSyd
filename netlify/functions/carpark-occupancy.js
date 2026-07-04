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
// HOW TO USE (all free):
// 1. Sign up at https://opendata.transport.nsw.gov.au (register an account,
//    create an "application" to get an API key)
// 2. Put this file in a folder called `netlify/functions/` in a GitHub repo
// 3. Deploy that repo to Netlify (free tier) and connect it
// 4. In Netlify's site settings, add an environment variable:
//    TFNSW_API_KEY = <the key you got from step 1>
// 5. Your live function URL will be something like:
//    https://your-site.netlify.app/.netlify/functions/carpark-occupancy
//    — put that in CONFIG.tfnswProxyUrl in the map's HTML file
//
// This function currently calls the Car Park API, which covers TfNSW
// Park&Ride and Sydney Metro car parks with real-time occupancy.

exports.handler = async function (event, context) {
  const API_KEY = process.env.TFNSW_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing TFNSW_API_KEY environment variable" }),
    };
  }

  try {
    const response = await fetch(
      "https://api.transport.nsw.gov.au/v1/carpark",
      {
        headers: {
          Authorization: `apikey ${API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "TfNSW API request failed" }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // allow your page to call this
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
