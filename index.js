import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebClient } from "@slack/web-api";

const app = express();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// CORSを全面的に許可
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-mcp-session-id");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// MCP サーバーの初期化
const server = new Server(
  { name: "slack-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ツール定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send_slack_message",
        description: "Slackの指定したチャンネルにメッセージを送信します。",
        inputSchema: {
          type: "object",
          properties: {
            channel: { type: "string", description: "チャンネル名またはID（例: #general）" },
            text: { type: "string", description: "送信する本文" }
          },
          required: ["channel", "text"]
        }
      }
    ]
  };
});

// ツール実行ハンドラー
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "send_slack_message") {
    const { channel, text } = request.params.arguments;
    try {
      const result = await slack.chat.postMessage({ channel, text });
      return {
        content: [{ type: "text", text: `メッセージを送信しました (TS: ${result.ts})` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Slackエラー: ${error.message}` }],
        isError: true
      };
    }
  }
  throw new Error("Tool not found");
});

// SSE接続の管理マップ（複数セッション対応）
const transports = new Map();

// SSEハンドラー本体
const handleSse = async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  req.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
};

// ルートと /sse の両方で SSE を受付可能にする
app.get("/", handleSse);
app.get("/sse", handleSse);

// POSTメッセージ受信用
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId) || Array.from(transports.values())[0];

  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE session");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Slack MCP Server running on port ${PORT}`);
});
