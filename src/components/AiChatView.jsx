import React, { useMemo, useState } from "react";
import { runBrain } from "../lib/brain";

// The system prompt does two jobs:
//  1. Gives the model enough knowledge of ClipCrate to answer "how do I..."
//     and "what can this do" questions accurately.
//  2. Defines a narrow, safe protocol the model can use to ADD a color
//     palette or a text clip to the user's board on request. There is
//     deliberately no delete/read action - the model can only append data,
//     never remove or enumerate what's already saved.
const SYSTEM_PROMPT = `You are the built-in AI assistant for ClipCrate, a browser extension popup for saving color palettes and text clips. Reply clearly and concisely, in markdown, staying readable in a small popup.

ABOUT CLIPCRATE - answer questions about the extension using this:
- ClipCrate has three views, reachable from the header: Clipboard (colors + text), this AI assistant, and a Share/Cloud Sync panel (the last icon in the header).
- Header icons, left to right: a "+" and a pipette icon grouped together, then a clipboard icon and a brain icon grouped together, then a trash icon, a share icon, and a close (X) icon.
- In the Clipboard view: "+" reads the system clipboard and saves the text as a new clip; the pipette opens the browser's eyedropper to pick a color from the screen and starts a new color palette with it.
- In this AI view: "+" instead pastes your current clipboard text into this chat box, and the pipette instead pastes a picked hex color into this chat box - neither one saves anything by itself here.
- The clipboard/brain pair switches between the Clipboard view and this AI view.
- The trash icon clears every saved clip and palette (press it twice within a second to confirm - it's destructive, so use it carefully).
- The share icon opens Cloud Sync settings: sign in anonymously, get a Sync ID, then use "Sync to Cloud" to back up your data or "Sync from Cloud" with another device's Sync ID to pull its data down.
- Inside a color palette: click "+" to add another color via the eyedropper (a palette can't contain the same color twice, but the same color CAN appear in a different palette); click a swatch to replace it with a new picked color; right-click a swatch or a palette for more options (copy hex/rgb, delete color, delete palette).
- Text clips: click a clip to expand and edit it, click again (or click away) to save; right-click a clip for Copy, Paste, Edit, or Delete. The same text can't be saved as a clip twice.
- Palettes hold up to 10 colors each.

ADDING DATA ON REQUEST:
If, and only if, the user clearly asks you to add something to their palettes or clips (e.g. "make me a blue and grey palette", "add the basic git commands as a clip", "save this as a note"), do two things in your reply:
1. Write a short, friendly confirmation sentence in plain text.
2. Include one self-closing <action> tag for every item the user asked you to add. You may include multiple action tags in one reply, including any combination of palettes and text clips. Use only these formats:
   - Add a color palette: <action type="add_palette" title="Short Title" colors="#RRGGBB,#RRGGBB,#RRGGBB" />
   - Add a text clip: <action type="add_text" text="the exact text to save" />

Rules for actions:
- Colors must be valid 6-digit hex codes, comma separated, no spaces required. Pick colors that genuinely match what the user described.
- Only use double quotes inside the tag, and never put a literal double-quote character inside an attribute value.
- Only ever use "add_palette" or "add_text". There is no delete, remove, clear, read, or list action available to you, and you must never claim to perform one, even if asked - if the user asks you to delete or view their saved data, explain that you can only add new items and they should do that from the Clipboard view directly.
- When the user requests several items, create all of them in the same reply and include all corresponding action tags. Never say you can only save one item per reply.
- Never include an <action> tag unless the user actually asked you to save/add something.
- Keep the confirmation sentence short since the action itself shows the result on the board.`;

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function escapeHtml(value = "") {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Pulls any <action type="..." .../> tags out of the model's raw reply,
// parses their attributes, and returns the reply text with the tags
// stripped so they never render as raw markup in the chat.
function extractActions(rawText = "") {
    const actions = [];
    const cleaned = rawText
        .replace(/<action\s+([^>]*?)\/?>(?:\s*<\/action>)?/gi, (_, attrsStr) => {
            const attrs = {};
            const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
            let match;
            while ((match = attrRegex.exec(attrsStr))) {
                attrs[match[1]] = match[2];
            }
            if (attrs.type === "add_palette" || attrs.type === "add_text") {
                actions.push(attrs);
            }
            return "";
        })
        .trim();

    return { cleaned, actions };
}

function markdownToHtml(markdown = "") {
    if (!markdown) return "";

    let html = escapeHtml(markdown)
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n");

    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
        const token = `__CODEBLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
        return token;
    });

    const lines = html.split("\n");
    const output = [];
    let listBuffer = [];
    let paragraphBuffer = [];

    const flushParagraph = () => {
        if (!paragraphBuffer.length) return;
        output.push(`<p>${paragraphBuffer.join("<br />")}</p>`);
        paragraphBuffer.length = 0;
    };

    const flushList = () => {
        if (!listBuffer.length) return;
        output.push(`<ul>${listBuffer.map((item) => `<li>${item}</li>`).join("")}</ul>`);
        listBuffer.length = 0;
    };

    const parseInline = (text) => {
        let rendered = escapeHtml(text);
        rendered = rendered.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        rendered = rendered.replace(/\*(.+?)\*/g, "<em>$1</em>");
        rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
        rendered = rendered.replace(/\[(.+?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
        return rendered;
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            flushList();
            continue;
        }

        if (/^#{1,3}\s+/.test(line)) {
            flushParagraph();
            flushList();
            const level = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#{1,3}\s+/, "");
            output.push(`<h${Math.min(level, 3)}>${parseInline(text)}</h${Math.min(level, 3)}>`);
            continue;
        }

        if (/^[-*]\s+/.test(line)) {
            flushParagraph();
            listBuffer.push(parseInline(line.replace(/^[-*]\s+/, "")));
            continue;
        }

        if (/^\d+\.\s+/.test(line)) {
            flushParagraph();
            listBuffer.push(parseInline(line.replace(/^\d+\.\s+/, "")));
            continue;
        }

        paragraphBuffer.push(parseInline(line));
    }

    flushParagraph();
    flushList();

    let finalHtml = output.join("");
    for (let i = 0; i < codeBlocks.length; i += 1) {
        finalHtml = finalHtml.replace(`__CODEBLOCK_${i}__`, codeBlocks[i]);
    }

    return finalHtml;
}

export default function AiChatView({
    input: inputProp,
    onInputChange,
    messages: messagesProp,
    onMessagesChange,
    onAddPalette,
    onAddTextSlot,
    providers,
    onKeyDisabled,
    showFeedback,
}) {
    const [internalMessages, setInternalMessages] = useState([]);
    const [internalInput, setInternalInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Controlled when the parent (App) supplies input/onInputChange - this is
    // what lets the header's Add/Dropper buttons paste straight into the box.
    // Falls back to local state so the component still works standalone.
    const isControlled = inputProp !== undefined && typeof onInputChange === "function";
    const input = isControlled ? inputProp : internalInput;
    const setInput = isControlled ? onInputChange : setInternalInput;
    const messages = Array.isArray(messagesProp) ? messagesProp : internalMessages;
    const setMessages = typeof onMessagesChange === "function" ? onMessagesChange : setInternalMessages;

    const payloadPreview = useMemo(() => {
        if (!input.trim()) return "";
        return input.trim().slice(0, 40);
    }, [input]);

    // Executes any add_palette / add_text actions the model requested.
    // This is intentionally the ONLY way the AI can touch saved data, and it
    // can only append - there is no delete or read path wired in here.
    const runActions = (actions) => {
        actions.forEach((action) => {
            if (action.type === "add_palette") {
                const colors = (action.colors || "")
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => HEX_COLOR_REGEX.test(c));
                if (colors.length && typeof onAddPalette === "function") {
                    onAddPalette(action.title, colors);
                }
            } else if (action.type === "add_text") {
                if (action.text && typeof onAddTextSlot === "function") {
                    onAddTextSlot(action.text);
                }
            }
        });
    };

    const sendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage = { role: "user", content: trimmedInput };
        setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "Thinking..." }]);
        setInput("");
        setError("");
        setIsLoading(true);

        try {
            const memory = messages
                .filter((message) => message.content && message.content.trim())
                .map((message) => ({
                    role: message.role === "user" ? "user" : "assistant",
                    content: message.content,
                }));
            memory.push({ role: "user", content: trimmedInput });

            const result = await runBrain({
                providers,
                systemPrompt: SYSTEM_PROMPT,
                messages: memory,
                onKeyDisabled,
            });

            if (!result.success) {
                throw new Error(result.error || "Unable to reach any configured AI provider.");
            }

            const rawTrimmed = typeof result.response === "string" ? result.response.trim() : "";
            if (!rawTrimmed) {
                throw new Error("The provider returned an empty response.");
            }

            const { cleaned, actions } = extractActions(rawTrimmed);
            if (actions.length) {
                runActions(actions);
            }
            const displayText = cleaned || "Done! I've updated your board.";

            setMessages((prev) => {
                const filtered = prev.filter((message) => message.content !== "Thinking...");
                return [...filtered, { role: "assistant", content: displayText }];
            });
        } catch (fetchError) {
            setError(fetchError.message || "Unable to reach the AI service.");
            setMessages((prev) => {
                const filtered = prev.filter((message) => message.content !== "Thinking...");
                return [
                    ...filtered,
                    {
                        role: "assistant",
                        content: "Sorry, I couldn’t reach the AI service. Please try again.",
                    },
                ];
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="ai-chat-panel">
            <div className="ai-chat-messages">
                {messages.length === 0 && (
                    <div className="ai-message assistant">
                        <div className="ai-message-content">
                            <p>
                                Hi! I'm the ClipCrate assistant. Ask me how to use the extension, or ask me
                                to add something - e.g. "create a blue and grey palette" or "add basic git
                                commands as a clip".
                            </p>
                        </div>
                    </div>
                )}
                {messages.map((message, index) => (
                    <div
                        key={`${message.role}-${index}`}
                        className={`ai-message ${message.role === "user" ? "user" : "assistant"}`}
                    >
                        <div
                            className="ai-message-content"
                            dangerouslySetInnerHTML={{
                                __html: markdownToHtml(message.content),
                            }}
                        />
                    </div>
                ))}
            </div>

            {error && <div className="ai-chat-error">{error}</div>}

            <div className="ai-chat-input-row">
                <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask the AI..."
                    rows={2}
                />
                <button
                    type="button"
                    className="ai-send-btn"
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? "..." : "↑"}
                </button>
            </div>

            {/* {payloadPreview && <div className="ai-chat-status">Sending: {payloadPreview}</div>} */}
        </div>
    );
}