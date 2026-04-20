#!/usr/bin/env node
import fetch from "node-fetch";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const prompt = process.argv.slice(2).join(" ");

const body = {
  model: "claude-3-opus-20240229",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }]
};

fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  body: JSON.stringify(body)
})
  .then(res => res.json())
  .then(data => console.log(data.content[0].text))
  .catch(err => console.error(err));
