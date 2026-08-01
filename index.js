import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from '@modelcontextprotocol/server-slack';

const app = express();
const port = process.env.PORT || 3000;

let transport;

app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  const server = createServer({
    token: process.env.SLACK_BOT_TOKEN,
    teamId: process.env.SLACK_TEAM_ID,
  });
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('SSE connection not established');
  }
});

app.listen(port, () => {
  console.log(`Slack MCP Server listening on port ${port}`);
});
