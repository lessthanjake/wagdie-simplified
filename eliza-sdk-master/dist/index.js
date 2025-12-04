import { z as c } from "zod";
class E extends Error {
  isRetryable;
  details;
  constructor(e, t = !1, s) {
    super(e), this.name = this.constructor.name, this.isRetryable = t, this.details = s, Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
  }
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      isRetryable: this.isRetryable,
      ...this.details && { details: this.details }
    };
  }
}
class w extends E {
  code = "API_ERROR";
  statusCode;
  constructor(e, t = 500, s) {
    const r = t >= 500 && t < 600;
    super(e, r, s), this.statusCode = t;
  }
  static fromResponse(e, t) {
    const s = t?.message || t?.error || `API error (${e})`;
    return new w(s, e, t?.details);
  }
}
class N extends E {
  code = "AUTH_ERROR";
  statusCode = 401;
  constructor(e = "Authentication failed") {
    super(e, !1);
  }
}
class x extends E {
  code = "RATE_LIMIT";
  statusCode = 429;
  retryAfter;
  constructor(e = "Rate limit exceeded", t) {
    super(e, !0, t ? { retryAfter: t } : void 0), this.retryAfter = t;
  }
  static fromHeaders(e) {
    const t = e.get("Retry-After"), s = t ? parseInt(t, 10) : void 0;
    return new x("Rate limit exceeded", s);
  }
}
class A extends E {
  code = "NETWORK_ERROR";
  statusCode = 0;
  constructor(e = "Network request failed", t) {
    super(e, !0, t ? { cause: t.message } : void 0), t && (this.cause = t);
  }
}
const D = 3e4, O = {
  maxRetries: 3,
  baseDelay: 1e3,
  retryServerErrors: !0
};
class H {
  baseUrl;
  timeout;
  retryConfig;
  getAuthHeader;
  constructor(e) {
    this.baseUrl = e.baseUrl.replace(/\/$/, ""), this.timeout = e.timeout ?? D, this.retryConfig = { ...O, ...e.retry }, this.getAuthHeader = e.getAuthHeader ?? (() => null);
  }
  setAuthHeaderProvider(e) {
    this.getAuthHeader = e;
  }
  async request(e, t = {}) {
    const { method: s = "GET", headers: r = {}, body: a, timeout: o, skipRetry: h = !1 } = t, n = `${this.baseUrl}${e.startsWith("/") ? e : `/${e}`}`, l = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...r
    }, f = this.getAuthHeader();
    f && (l.Authorization = f);
    const g = {
      method: s,
      headers: l,
      ...a !== void 0 && { body: JSON.stringify(a) }
    }, u = o ?? this.timeout;
    let p;
    const I = h ? 1 : this.retryConfig.maxRetries + 1;
    for (let y = 0; y < I; y++)
      try {
        const m = await this.fetchWithTimeout(n, g, u);
        return await this.handleResponse(m);
      } catch (m) {
        if (p = m, !this.shouldRetry(m, y))
          throw m;
        const C = this.calculateDelay(y);
        await this.sleep(C);
      }
    throw p;
  }
  async fetchWithTimeout(e, t, s) {
    const r = new AbortController(), a = setTimeout(() => r.abort(), s);
    try {
      return await fetch(e, {
        ...t,
        signal: r.signal
      });
    } catch (o) {
      throw o instanceof DOMException && o.name === "AbortError" ? new A("Request timed out") : new A(
        "Network request failed",
        o instanceof Error ? o : void 0
      );
    } finally {
      clearTimeout(a);
    }
  }
  async handleResponse(e) {
    if (e.status === 429)
      throw x.fromHeaders(e.headers);
    if (e.status === 401) {
      const s = await this.safeParseJSON(e);
      throw new N(s?.message || "Authentication failed");
    }
    if (!e.ok) {
      const s = await this.safeParseJSON(e);
      throw w.fromResponse(e.status, s ?? void 0);
    }
    const t = e.headers.get("Content-Type");
    if (e.status === 204 || !t?.includes("application/json"))
      return {};
    try {
      return await e.json();
    } catch {
      throw new w("Invalid JSON response", e.status);
    }
  }
  async safeParseJSON(e) {
    try {
      return await e.json();
    } catch {
      return null;
    }
  }
  shouldRetry(e, t) {
    return t >= this.retryConfig.maxRetries ? !1 : "isRetryable" in e && typeof e.isRetryable == "boolean" ? e instanceof x && e.retryAfter ? !0 : e instanceof w && e.statusCode >= 500 ? this.retryConfig.retryServerErrors : e.isRetryable : e instanceof A;
  }
  calculateDelay(e) {
    const t = this.retryConfig.baseDelay * Math.pow(2, e), s = Math.random() * 0.3 * t;
    return Math.min(t + s, 3e4);
  }
  sleep(e) {
    return new Promise((t) => setTimeout(t, e));
  }
  // Convenience methods
  async get(e, t) {
    return this.request(e, { ...t, method: "GET" });
  }
  async post(e, t, s) {
    return this.request(e, { ...s, method: "POST", body: t });
  }
  async put(e, t, s) {
    return this.request(e, { ...s, method: "PUT", body: t });
  }
  async patch(e, t, s) {
    return this.request(e, { ...s, method: "PATCH", body: t });
  }
  async delete(e, t) {
    return this.request(e, { ...t, method: "DELETE" });
  }
}
const v = "eliza_auth_tokens", P = 5 * 60 * 1e3;
class q {
  apiKey;
  tokens;
  httpClient;
  refreshPromise;
  onTokenRefresh;
  onAuthRequired;
  constructor(e) {
    this.apiKey = e.apiKey, this.onTokenRefresh = e.onTokenRefresh, this.onAuthRequired = e.onAuthRequired, e.accessToken ? this.tokens = { accessToken: e.accessToken } : typeof window < "u" && this.loadFromStorage();
  }
  setHttpClient(e) {
    this.httpClient = e;
  }
  /**
   * Get the authorization header value
   */
  getAuthHeader() {
    return this.apiKey ? `Bearer ${this.apiKey}` : this.tokens?.accessToken ? `Bearer ${this.tokens.accessToken}` : null;
  }
  /**
   * Check if we have valid authentication
   */
  isAuthenticated() {
    return this.apiKey ? !0 : !(!this.tokens?.accessToken || this.tokens.expiresAt && Date.now() >= this.tokens.expiresAt);
  }
  /**
   * Check if token needs refresh
   */
  needsRefresh() {
    return this.apiKey || !this.tokens?.refreshToken || !this.tokens.expiresAt ? !1 : Date.now() >= this.tokens.expiresAt - P;
  }
  /**
   * Set tokens after successful authentication
   */
  setTokens(e) {
    this.tokens = e, this.saveToStorage(), this.onTokenRefresh?.(e);
  }
  /**
   * Clear all auth state
   */
  clearAuth() {
    this.tokens = void 0, this.clearStorage();
  }
  /**
   * Refresh the access token
   */
  async refreshTokens() {
    if (this.refreshPromise)
      return this.refreshPromise;
    if (!this.tokens?.refreshToken || !this.httpClient)
      throw this.onAuthRequired?.(), new Error("No refresh token available");
    this.refreshPromise = this.doRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = void 0;
    }
  }
  async doRefresh() {
    try {
      const e = await this.httpClient.post("/auth/refresh", {
        refreshToken: this.tokens.refreshToken
      }), t = {
        accessToken: e.accessToken,
        refreshToken: e.refreshToken || this.tokens.refreshToken,
        expiresAt: e.expiresIn ? Date.now() + e.expiresIn * 1e3 : this.tokens.expiresAt
      };
      this.setTokens(t);
    } catch {
      throw this.clearAuth(), this.onAuthRequired?.(), new Error("Token refresh failed");
    }
  }
  // SIWE Auth Flow Methods
  /**
   * Get nonce for SIWE authentication
   */
  async getNonce() {
    if (!this.httpClient)
      throw new Error("HTTP client not initialized");
    return this.httpClient.get("/auth/nonce");
  }
  /**
   * Verify SIWE message and signature
   */
  async verify(e, t, s) {
    if (!this.httpClient)
      throw new Error("HTTP client not initialized");
    const r = await this.httpClient.post("/auth/verify", { message: e, signature: t, sessionId: s }), a = {
      accessToken: r.token,
      refreshToken: r.refreshToken,
      expiresAt: r.expiresIn ? Date.now() + r.expiresIn * 1e3 : void 0
    };
    return this.setTokens(a), a;
  }
  // Storage Methods
  loadFromStorage() {
    try {
      const e = localStorage.getItem(v);
      e && (this.tokens = JSON.parse(e));
    } catch {
    }
  }
  saveToStorage() {
    if (!(typeof window > "u" || !this.tokens))
      try {
        localStorage.setItem(v, JSON.stringify(this.tokens));
      } catch {
      }
  }
  clearStorage() {
    if (!(typeof window > "u"))
      try {
        localStorage.removeItem(v);
      } catch {
      }
  }
}
async function U(i, e, t) {
  const { url: s, getAuthHeader: r, timeout: a = 6e4 } = i, o = new AbortController(), h = setTimeout(() => o.abort(), a);
  try {
    const n = {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    }, l = r();
    l && (n.Authorization = l);
    const f = await fetch(s, {
      method: "POST",
      headers: n,
      body: JSON.stringify(e),
      signal: o.signal
    });
    if (!f.ok)
      throw w.fromResponse(f.status);
    if (!f.body)
      throw new A("No response body");
    const g = f.body.getReader(), u = new TextDecoder();
    let p = "", I = "", y = "";
    for (; ; ) {
      const { done: m, value: C } = await g.read();
      if (m)
        break;
      const $ = u.decode(C, { stream: !0 }).split(`
`);
      for (const S of $)
        if (S.startsWith("data: ")) {
          const T = S.slice(6);
          if (T === "[DONE]")
            continue;
          try {
            const d = JSON.parse(T);
            if (d.token || d.content) {
              const k = d.token || d.content;
              p += k, t.onChunk(k);
            }
            if (d.conversationId && (y = d.conversationId), (d.messageId || d.id) && (I = d.messageId || d.id), d.done || d.type === "complete") {
              const k = {
                id: I,
                role: "assistant",
                content: p,
                createdAt: (/* @__PURE__ */ new Date()).toISOString()
              };
              t.onComplete(k, y);
            }
          } catch {
            T.trim() && (p += T, t.onChunk(T));
          }
        }
    }
    if (p && !I) {
      const m = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        role: "assistant",
        content: p,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      t.onComplete(m, y);
    }
  } catch (n) {
    n instanceof DOMException && n.name === "AbortError" ? t.onError(new A("Stream timed out")) : n instanceof w ? t.onError(n) : t.onError(
      new A(
        "Stream failed",
        n instanceof Error ? n : void 0
      )
    );
  } finally {
    clearTimeout(h);
  }
}
class _ {
  constructor(e, t) {
    this.http = e, this.getAuthHeader = t;
  }
  /**
   * Send a message and get the complete response
   */
  async sendMessage(e) {
    const { characterId: t, message: s, conversationId: r } = e, a = r ? `/characters/${t}/chat/${r}` : `/characters/${t}/chat`;
    return this.http.post(a, { message: s });
  }
  /**
   * Send a message and stream the response
   */
  async sendMessageStream(e, t) {
    const { characterId: s, message: r, conversationId: a } = e, o = this.http.baseUrl || "", h = a ? `/characters/${s}/chat/${a}/stream` : `/characters/${s}/chat/stream`, n = `${o}${h}`;
    await U(
      {
        url: n,
        getAuthHeader: this.getAuthHeader,
        timeout: 6e4
      },
      { message: r },
      t
    );
  }
}
class R extends E {
  code = "VALIDATION_ERROR";
  statusCode = 400;
  fieldErrors;
  constructor(e = "Validation failed", t = {}) {
    super(e, !1, { fieldErrors: t }), this.fieldErrors = t;
  }
  static fromFields(e) {
    const t = Object.keys(e), s = t.length > 0 ? `Validation failed for: ${t.join(", ")}` : "Validation failed";
    return new R(s, e);
  }
}
const b = c.object({
  role: c.enum(["user", "assistant"]),
  content: c.string().max(1e3)
}), M = c.object({
  all: c.array(c.string()).optional(),
  chat: c.array(c.string()).optional(),
  post: c.array(c.string()).optional()
}), j = c.object({
  name: c.string().min(1, "Name is required").max(100, "Name too long").trim(),
  personality: c.string().min(10, "Personality must be at least 10 characters").max(5e3),
  backstory: c.string().min(10, "Backstory must be at least 10 characters").max(1e4),
  systemPrompt: c.string().max(5e3).optional(),
  exampleMessages: c.array(b).max(20).optional(),
  style: M.optional(),
  externalId: c.string().max(255).optional()
}), W = c.object({
  name: c.string().min(1).max(100).trim().optional(),
  personality: c.string().min(10).max(5e3).optional(),
  backstory: c.string().min(10).max(1e4).optional(),
  systemPrompt: c.string().max(5e3).optional(),
  exampleMessages: c.array(b).max(20).optional(),
  style: M.optional()
});
function z(i) {
  const e = j.safeParse(i);
  if (!e.success) {
    const t = {};
    for (const s of e.error.issues) {
      const r = s.path.join(".");
      t[r] || (t[r] = []), t[r].push(s.message);
    }
    throw R.fromFields(t);
  }
  return e.data;
}
function F(i) {
  const e = W.safeParse(i);
  if (!e.success) {
    const t = {};
    for (const s of e.error.issues) {
      const r = s.path.join(".");
      t[r] || (t[r] = []), t[r].push(s.message);
    }
    throw R.fromFields(t);
  }
  return e.data;
}
class B {
  constructor(e) {
    this.http = e;
  }
  /**
   * List all characters (with pagination)
   */
  async list(e = {}) {
    const { page: t = 1, pageSize: s = 20 } = e, r = await this.http.get(`/characters?page=${t}&pageSize=${s}`);
    return {
      items: r.characters,
      total: r.total,
      page: t,
      pageSize: s,
      hasMore: t * s < r.total
    };
  }
  /**
   * Get a character by ID
   */
  async get(e) {
    return this.http.get(`/characters/${e}`);
  }
  /**
   * Create a new character
   * If externalId is provided and a character with that externalId exists,
   * it will be updated instead (upsert behavior)
   */
  async create(e) {
    const t = z(e), s = {
      name: t.name,
      config: {
        bio: t.backstory,
        personality: t.personality,
        style: t.style,
        messageExamples: t.exampleMessages?.map((r) => [
          { user: r.role, content: { text: r.content } }
        ])
      },
      externalId: t.externalId
    };
    return this.http.post("/characters", s);
  }
  /**
   * Update an existing character
   */
  async update(e, t) {
    const s = F(t), r = {};
    s.name !== void 0 && (r.name = s.name);
    const a = {};
    return s.backstory !== void 0 && (a.bio = s.backstory), s.personality !== void 0 && (a.personality = s.personality), s.style !== void 0 && (a.style = s.style), s.exampleMessages !== void 0 && (a.messageExamples = s.exampleMessages.map((o) => [
      { user: o.role, content: { text: o.content } }
    ])), Object.keys(a).length > 0 && (r.config = a), this.http.put(`/characters/${e}`, r);
  }
  /**
   * Delete a character
   */
  async delete(e) {
    await this.http.delete(`/characters/${e}`);
  }
  /**
   * Get a character by external ID
   * Useful for integrations that track characters by their own IDs
   */
  async getByExternalId(e) {
    try {
      return await this.http.get(
        `/characters/external/${encodeURIComponent(e)}`
      );
    } catch (t) {
      if (t && typeof t == "object" && "statusCode" in t && t.statusCode === 404)
        return null;
      throw t;
    }
  }
}
class K {
  constructor(e) {
    this.http = e;
  }
  /**
   * List all conversations for the authenticated user
   */
  async list(e = {}) {
    const { page: t = 1, pageSize: s = 20 } = e, r = await this.http.get(`/conversations?page=${t}&pageSize=${s}`);
    return {
      items: r.conversations.map((a) => this.mapConversation(a)),
      total: r.total,
      page: t,
      pageSize: s,
      hasMore: t * s < r.total
    };
  }
  /**
   * List conversations for a specific character
   */
  async listForCharacter(e, t = {}) {
    const { page: s = 1, pageSize: r = 20 } = t, a = await this.http.get(`/characters/${e}/conversations?page=${s}&pageSize=${r}`);
    return {
      items: a.conversations.map((o) => this.mapConversation(o)),
      total: a.total,
      page: s,
      pageSize: r,
      hasMore: s * r < a.total
    };
  }
  /**
   * Get a conversation with its message history
   */
  async get(e) {
    const t = await this.http.get(`/conversations/${e}`);
    return {
      id: t.id,
      characterId: t.characterId,
      characterName: "",
      // May not be available from this endpoint
      messageCount: t.messages.length,
      lastMessageAt: t.updatedAt,
      createdAt: t.createdAt,
      messages: t.messages
    };
  }
  /**
   * Delete a conversation and all its messages
   */
  async delete(e) {
    await this.http.delete(`/conversations/${e}`);
  }
  /**
   * Map API response to Conversation type
   */
  mapConversation(e) {
    return {
      id: e.id,
      characterId: e.characterId,
      characterName: "",
      // May need to be fetched separately
      messageCount: e.messageCount ?? 0,
      lastMessageAt: e.updatedAt,
      createdAt: e.createdAt
    };
  }
}
class Y {
  http;
  authManager;
  baseUrl;
  // Lazy-loaded namespaced APIs
  _characters;
  _chat;
  _conversations;
  _auth;
  constructor(e) {
    this.baseUrl = e.baseUrl.replace(/\/$/, ""), this.authManager = new q({
      apiKey: e.apiKey,
      accessToken: e.accessToken
    }), this.http = new H({
      baseUrl: this.baseUrl,
      timeout: e.timeout,
      retry: e.retry,
      getAuthHeader: () => this.authManager.getAuthHeader()
    }), this.authManager.setHttpClient(this.http);
  }
  /**
   * Verify the current credentials are valid
   */
  async verifyCredentials() {
    return this.http.get("/integration/verify");
  }
  /**
   * Check if the client is authenticated
   */
  isAuthenticated() {
    return this.authManager.isAuthenticated();
  }
  /**
   * Access auth methods
   */
  get auth() {
    return this._auth || (this._auth = new J(this.authManager)), this._auth;
  }
  /**
   * Access characters API
   */
  get characters() {
    return this._characters || (this._characters = new B(this.http)), this._characters;
  }
  /**
   * Access chat API
   */
  get chat() {
    return this._chat || (this._chat = new _(this.http, () => this.authManager.getAuthHeader())), this._chat;
  }
  /**
   * Access conversations API
   */
  get conversations() {
    return this._conversations || (this._conversations = new K(this.http)), this._conversations;
  }
  /**
   * Get the underlying HTTP client (for advanced usage)
   */
  getHttpClient() {
    return this.http;
  }
}
class J {
  constructor(e) {
    this.authManager = e;
  }
  /**
   * Get a nonce for SIWE authentication
   */
  async getNonce() {
    return this.authManager.getNonce();
  }
  /**
   * Verify SIWE message and signature
   */
  async verify(e, t, s) {
    return this.authManager.verify(e, t, s);
  }
  /**
   * Refresh the access token
   */
  async refresh() {
    return this.authManager.refreshTokens();
  }
  /**
   * Clear authentication state
   */
  logout() {
    this.authManager.clearAuth();
  }
  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return this.authManager.isAuthenticated();
  }
}
function Q(i) {
  const {
    domain: e,
    address: t,
    statement: s,
    uri: r,
    chainId: a,
    nonce: o,
    issuedAt: h = (/* @__PURE__ */ new Date()).toISOString(),
    expirationTime: n,
    notBefore: l,
    requestId: f,
    resources: g
  } = i;
  if (!e) throw new Error("domain is required");
  if (!t) throw new Error("address is required");
  if (!r) throw new Error("uri is required");
  if (!a) throw new Error("chainId is required");
  if (!o) throw new Error("nonce is required");
  if (!/^0x[a-fA-F0-9]{40}$/.test(t))
    throw new Error("Invalid Ethereum address format");
  const u = [
    `${e} wants you to sign in with your Ethereum account:`,
    t,
    ""
  ];
  if (s && u.push(s, ""), u.push(`URI: ${r}`), u.push("Version: 1"), u.push(`Chain ID: ${a}`), u.push(`Nonce: ${o}`), u.push(`Issued At: ${h}`), n && u.push(`Expiration Time: ${n}`), l && u.push(`Not Before: ${l}`), f && u.push(`Request ID: ${f}`), g && g.length > 0) {
    u.push("Resources:");
    for (const p of g)
      u.push(`- ${p}`);
  }
  return u.join(`
`);
}
function X(i, e) {
  try {
    const t = V(i);
    return e?.domain && t.domain !== e.domain ? {
      success: !1,
      error: `Domain mismatch: expected ${e.domain}, got ${t.domain}`
    } : e?.nonce && t.nonce !== e.nonce ? {
      success: !1,
      error: "Nonce mismatch"
    } : e?.checkExpiration && t.expirationTime && new Date(t.expirationTime) < /* @__PURE__ */ new Date() ? {
      success: !1,
      error: "Message has expired"
    } : t.notBefore && new Date(t.notBefore) > /* @__PURE__ */ new Date() ? {
      success: !1,
      error: "Message is not yet valid"
    } : {
      success: !0,
      address: t.address,
      fields: t
    };
  } catch (t) {
    return {
      success: !1,
      error: t instanceof Error ? t.message : "Failed to parse message"
    };
  }
}
function V(i) {
  const e = i.split(`
`);
  if (e.length < 7)
    throw new Error("Invalid SIWE message format");
  const t = e[0].match(/^(.+) wants you to sign in with your Ethereum account:$/);
  if (!t)
    throw new Error("Invalid SIWE header");
  const s = t[1], r = e[1];
  if (!/^0x[a-fA-F0-9]{40}$/.test(r))
    throw new Error("Invalid Ethereum address");
  const a = {
    domain: s,
    address: r,
    uri: "",
    chainId: 0,
    nonce: ""
  };
  let o = [], h = 3;
  for (; h < e.length && !e[h].startsWith("URI:"); )
    e[h] && o.push(e[h]), h++;
  for (o.length > 0 && (a.statement = o.join(`
`)); h < e.length; h++) {
    const n = e[h];
    if (n.startsWith("URI: "))
      a.uri = n.slice(5);
    else if (n.startsWith("Chain ID: "))
      a.chainId = parseInt(n.slice(10), 10);
    else if (n.startsWith("Nonce: "))
      a.nonce = n.slice(7);
    else if (n.startsWith("Issued At: "))
      a.issuedAt = n.slice(11);
    else if (n.startsWith("Expiration Time: "))
      a.expirationTime = n.slice(17);
    else if (n.startsWith("Not Before: "))
      a.notBefore = n.slice(12);
    else if (n.startsWith("Request ID: "))
      a.requestId = n.slice(12);
    else if (n === "Resources:") {
      a.resources = [];
      for (let l = h + 1; l < e.length && e[l].startsWith("- "); l++)
        a.resources.push(e[l].slice(2));
    }
  }
  if (!a.uri) throw new Error("Missing URI field");
  if (!a.chainId) throw new Error("Missing Chain ID field");
  if (!a.nonce) throw new Error("Missing Nonce field");
  return a;
}
function Z(i = 16) {
  const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let t = "";
  if (typeof crypto < "u" && crypto.getRandomValues) {
    const s = new Uint8Array(i);
    crypto.getRandomValues(s);
    for (let r = 0; r < i; r++)
      t += e[s[r] % e.length];
  } else
    for (let s = 0; s < i; s++)
      t += e[Math.floor(Math.random() * e.length)];
  return t;
}
function ee(i) {
  return i instanceof E;
}
const te = "0.1.0";
export {
  B as CharactersAPI,
  _ as ChatAPI,
  K as ConversationsAPI,
  j as CreateCharacterInputSchema,
  w as ElizaAPIError,
  N as ElizaAuthError,
  Y as ElizaClient,
  E as ElizaError,
  A as ElizaNetworkError,
  x as ElizaRateLimitError,
  R as ElizaValidationError,
  W as UpdateCharacterInputSchema,
  te as VERSION,
  Q as createSIWEMessage,
  Z as generateNonce,
  ee as isElizaError,
  z as validateCreateCharacter,
  F as validateUpdateCharacter,
  X as verifySIWEMessage
};
//# sourceMappingURL=index.js.map
