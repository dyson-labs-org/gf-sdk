import axios from "axios";

export function gfClient(baseUrl: string, apiKey: string) {
  return axios.create({
    baseURL: `${baseUrl.replace(/\/+$/, "")}/api/v1`,
    headers: { Authorization: `token ${apiKey}`, "Content-Type": "application/json" },
    timeout: 15000
  });
}
