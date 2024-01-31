const http = require('http');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const port = process.env.PORT || 8080;
const session = {};

const clientId = "C25a40239469b7a3c87cd5eaa97ccb77917def63bce60b307a33b6bd3183d5454";
const clientSecret = "0cc26a4f75a4b7ac1931f1ab5fcc112b8031668ff5542ed448321d7ac019de63";
const redirectURI = "http://localhost:8080/message.html";

const scopes = encodeURIComponent("spark-admin:broadworks_subscribers_write meeting:admin_participants_read spark:people_write spark-admin:wholesale_customers_write spark-admin:workspace_metrics_read spark-admin:wholesale_billing_reports_read spark:places_read spark-admin:video_mesh_api_webhook_write meeting:admin_config_write spark-compliance:messages_read spark-admin:workspaces_write spark-compliance:meetings_write spark-admin:locations_write meeting:schedules_write spark-admin:broadworks_enterprises_read spark:calls_read meeting:recordings_write spark:devices_read spark:telephony_config_write spark-admin:broadworks_billing_reports_read spark-admin:video_mesh_api_read spark-compliance:webhooks_read spark-compliance:webhooks_write spark-compliance:meetings_read spark-admin:workspaces_read spark:telephony_config_read spark-compliance:rooms_read spark-admin:broadworks_subscribers_read spark-admin:organizations_read spark-admin:broadworks_billing_reports_write spark-admin:video_mesh_api_write spark-compliance:meetings_write spark-admin:devices_read spark-admin:telephony_config_write spark-admin:broadworks_enterprises_write meeting:schedules_read spark-admin:places_write meeting:admin_preferences_write spark:all meeting:admin_preferences_read analytics:read_all spark-admin:people_write spark:organizations_read spark-admin:places_read spark-compliance:team_memberships_write identity:groups_read identity:tokens_read spark-compliance:recordings_read spark-admin:devices_write spark:calls_write Identity:one_time_password spark-admin:workspace_locations_read spark-compliance:recordings_write spark:xapi_commands spark-compliance:messages_write spark-admin:wholesale_customers_read meeting:participants_write meeting:admin_recordings_read meeting:transcripts_read identity:tokens_write spark:xapi_statuses spark-admin:wholesale_subscribers_write spark-admin:calling_cdr_read meeting:controls_write meeting:admin_recordings_write audit:events_read spark-compliance:rooms_write");
// Update with your actual scopes

const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url);
  const queryParams = querystring.parse(query);

  if (pathname === '/') {
    const state = crypto.randomBytes(64).toString('hex');
    session.state = state;

    const authUrl = `https://webexapis.com/v1/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectURI)}&scope=${scopes}&state=${state}&response_type=code`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Welcome to Webex OAuth Integration</h1>
      <a href="${authUrl}">Start Login</a>
    `);
  } else if (pathname === '/oauth') {
    const { code, state } = queryParams;

    if (!code || !state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      return res.end("Missing required parameters. Aborting OAuth process.");
    }

    const storedState = session.state;

    if (state !== storedState) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end("Invalid state. Aborting OAuth process.");
    }

    console.log("Received code:", code);
    console.log("Received state:", state);

    const tokenUrl = "https://webexapis.com/v1/access_token";
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectURI,
    });

    const options = {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: params,
    };

    try {
      const response = await fetch(tokenUrl, options);
      const data = await response.json();

      session.token = data.access_token;
      console.log("Access Token:", data.access_token);
      res.writeHead(302, { 'Location': '/index.html' });
      res.end();
    } catch (error) {
      console.error("Error fetching access token:", error);
      res.writeHead(302, { 'Location': '/index.html' });
      res.end();
    }
  } else if (pathname === '/user') {
    const token = session.token;

    if (!token) {
      res.writeHead(302, { 'Location': '/' });
      return res.end();
    }

    const peopleApiUrl = "https://webexapis.com/v1/people/me";
    const options = { headers: { authorization: `Bearer ${token}` } };

    try {
      const response = await fetch(peopleApiUrl, options);
      const data = await response.json();

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h1>Welcome, ${data.displayName}!</h1>`);
    } catch (error) {
      console.error("Error fetching user info:", error);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end("Error fetching user info. Please try again.");
    }
  
  } else if (pathname === '/message.html') {
    try {
      const filePath = path.join(__dirname, 'message.html');
      const content = await fs.readFile(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (error) {
      console.error("Error reading message.html:", error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>Not Found</h1>');
  }
});

server.listen(port, () => {
  console.log(`Webex OAuth Integration started on http://localhost:${port}`);
});

