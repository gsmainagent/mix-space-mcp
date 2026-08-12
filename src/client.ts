import axios, { type AxiosInstance } from "axios"
import type { Config } from "./config.js"

export class MixSpaceClient {
  private http: AxiosInstance

  constructor(config: Config) {
    const headers: Record<string, string> = {
      "User-Agent": "mixspace-mcp/1.0",
    }
    if (config.apiKey) {
      headers["x-api-key"] = config.apiKey
    }
    this.http = axios.create({
      baseURL: config.apiUrl,
      headers,
      timeout: 30_000,
    })
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const clean: Record<string, unknown> = {}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          clean[k] = v
        }
      }
    }
    const res = await this.http.get<T>(path, { params: clean })
    return res.data
  }
}
