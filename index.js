import express from 'express';
import { spawn } from 'child_process';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let mcpProcess = null;

// MCPサーバー（stdio）の起動
function startMcpProcess() {
  if (mcpProcess) return mcpProcess;

  mcpProcess = spawn('npx', ['-y', '@modelcontextprotocol/server-slack'], {
    env: {
      ...process.env,
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_TEAM_ID: process.env.SLACK_TEAM_ID,
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  mcpProcess.on('exit', (code) => {
    console.log(`MCP process exited with code ${code}`);
    mcpProcess = null;
  });

  return mcpProcess;
}

// ヘルスチェック用
app.get('/', (req, res) => {
  res.send('Slack MCP Wrapper Server is Running');
});

// SSE エンドポイント
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const proc = startMcpProcess();

  const onData = (data) => {
    res.write(`data: ${data.toString()}\n\n`);
  };

  proc.stdout.on('data', onData);

  req.on('close', () => {
    proc.stdout.off('data', onData);
  });
});

app.listen(port, () => {
  console.log(`Slack MCP Wrapper listening on port ${port}`);
});
