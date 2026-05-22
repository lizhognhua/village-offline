/**
 * XSS 净化工具
 * 递归清洗对象中的所有字符串字段，移除 HTML/JS 注入
 */
const DANGEROUS_TAGS = /<\s*\/(script|iframe|object|embed|form|input|textarea|select|option|style|link|meta|applet|frame|frameset|noscript|ilayer|layer|base|svg|math|xmp|plaintext)[^>]*>/gi;
const JS_EVENTS = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const JS_PROTOCOL = /\bjavascript\s*:/gi;
const DANGEROUS_DATA = /data\s*:\s*(text\/html|text\/javascript|application\/x-javascript)/gi;

export function sanitizeString(input: string): string {
  if (typeof input !== "string") return input;
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed\s*>/gi, "")
    .replace(DANGEROUS_TAGS, "")
    .replace(JS_EVENTS, "")
    .replace(JS_PROTOCOL, "blocked:")
    .replace(DANGEROUS_DATA, "blocked:");
}

export function sanitizePlainText(input: string): string {
  if (typeof input !== "string") return input;
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * 净化 HTML 内容，用于 dangerouslySetInnerHTML 之前
 * 移除危险标签和事件处理器，保留安全的 HTML 格式
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input
    // 移除 script/iframe/object/embed 标签及其内容
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed\s*>/gi, "")
    // 移除危险标签（保留内容）
    .replace(/<\s*\/?(script|iframe|object|embed|form|input|select|option|style|link|meta|applet|frame|frameset|noscript|base|svg)\b[^>]*>/gi, "")
    // 移除事件处理器属性
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "")
    // 移除 javascript: 和 data: 协议
    .replace(/javascript\s*:/gi, "blocked:")
    .replace(/data\s*:\s*(text\/html|text\/javascript|application\/x-javascript)/gi, "blocked:");
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj) as unknown as T;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item)) as unknown as T;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    cleaned[key] = sanitizeObject(value);
  }
  return cleaned as T;
}
