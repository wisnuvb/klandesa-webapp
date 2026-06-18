import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

/**
 * Plugin remark standar untuk chat AI (GFM + line break).
 * Pre-processing LLM tetap di normalizeChatMarkdown sebelum parse.
 */
export const chatRemarkPlugins: PluggableList = [remarkGfm, remarkBreaks];
