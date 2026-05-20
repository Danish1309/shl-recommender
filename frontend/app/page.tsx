"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";
import { ChatMessage } from "@/lib/types";
import { sendChatMessage } from "@/lib/api";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hello! I'm your SHL Assessment Advisor. I can help you find the right assessments for any role — whether you're hiring, developing talent, or running a team audit.\n\nTell me about the role or situation, and I'll recommend the most relevant SHL assessments from the catalog.",
  recommendations: [],
};

const EXAMPLE_PROMPTS = [
  "Hiring a senior Java backend engineer",
  "Graduate management trainee scheme — cognitive, personality, SJT",
  "500 entry-level contact center agents, English US",
  "Sales force reskilling audit for our 200 reps",
  "CXO-level leadership selection with benchmark",
];

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        role: "user",
        content: userInput.trim(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setError(null);
      setIsLoading(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      try {
        // Send only role+content (strip UI-only fields)
        const apiMessages = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await sendChatMessage(apiMessages);

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.reply,
          recommendations: response.recommendations,
          end_of_conversation: response.end_of_conversation,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(msg);
        // Remove the optimistically added user message on error
        setMessages(messages);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setError(null);
    inputRef.current?.focus();
  };

  const isConversationEnded =
    messages.length > 0 &&
    messages[messages.length - 1]?.end_of_conversation === true;

  return (
    <div className="flex flex-col h-screen bg-shl-dark-bg">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-shl-border bg-shl-chat-bg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-shl-blue flex items-center justify-center">
              <span className="text-white text-sm font-bold tracking-tight">
                SHL
              </span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-shl-text-primary">
                Assessment Advisor
              </h1>
              <p className="text-xs text-shl-text-muted">
                Powered by SHL Product Catalog
              </p>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-shl-text-muted hover:text-shl-text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-shl-surface border border-transparent hover:border-shl-border"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v1m6.364 1.636l-.707.707M20 12h-1M17.657 17.657l-.707-.707M12 19v1M6.343 17.657l-.707.707M4 12H3M6.343 6.343l.707.707"
              />
            </svg>
            New chat
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4 space-y-1">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}

          {/* Error display */}
          {error && (
            <div className="mx-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <span className="font-medium">Error: </span>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-shl-border bg-shl-chat-bg">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Example prompts (only shown at start) */}
          {messages.length === 1 && !isLoading && (
            <div className="mb-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full bg-shl-surface border border-shl-border text-shl-text-secondary hover:text-shl-text-primary hover:border-shl-blue/40 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Ended conversation notice */}
          {isConversationEnded && (
            <div className="mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-emerald-400">
                ✓ Shortlist confirmed. Start a new chat to explore other roles.
              </span>
              <button
                onClick={clearChat}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                New chat →
              </button>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Describe the role or ask about assessments..."
                rows={1}
                disabled={isLoading || isConversationEnded}
                className="w-full bg-shl-surface border border-shl-border rounded-xl px-4 py-3 text-sm text-shl-text-primary placeholder-shl-text-muted resize-none focus:outline-none focus:border-shl-blue/60 focus:ring-1 focus:ring-shl-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors leading-relaxed"
                style={{ minHeight: "48px", maxHeight: "160px" }}
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading || isConversationEnded}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-shl-blue hover:bg-shl-blue-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              {isLoading ? (
                <svg
                  className="w-4 h-4 text-white animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              )}
            </button>
          </form>

          <p className="mt-2 text-center text-[10px] text-shl-text-muted">
            Recommendations are based on the SHL product catalog. URLs are
            verified against catalog data.
          </p>
        </div>
      </div>
    </div>
  );
}
