"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/lib/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Counterpart {
  id: string;
  firstName: string;
  lastName: string;
}

const POLL_INTERVAL_MS = 5000;

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function MessagesPage({ counterparts }: { counterparts: Counterpart[] }) {
  const utils = trpc.useUtils();
  const currentUser = useAuthStore((state) => state.user);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const conversationsQuery = trpc.messages.listConversations.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
  });
  const messagesQuery = trpc.messages.listMessages.useQuery(
    { conversationId: conversationId ?? "" },
    { enabled: !!conversationId, refetchInterval: POLL_INTERVAL_MS },
  );

  const startConversationMutation = trpc.messages.getOrCreateConversation.useMutation({
    onSuccess: (conversation) => {
      setConversationId(conversation.id);
      utils.messages.listConversations.invalidate();
    },
  });

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setDraft("");
      if (conversationId) {
        utils.messages.listMessages.invalidate({ conversationId });
      }
      utils.messages.listConversations.invalidate();
    },
  });

  function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !draft.trim()) return;
    sendMutation.mutate({ conversationId, content: draft.trim() });
  }

  const conversations = conversationsQuery.data ?? [];
  const selectedConversation = conversations.find((conversation) => conversation.id === conversationId);
  // Karşı taraf, benim rolümün tersidir (danışan ↔ diyetisyen).
  const counterpartRoleLabel = currentUser?.role === "DIETITIAN" ? "Danışan" : "Diyetisyen";

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1 space-y-4">
        {counterparts.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Sohbet Başlat</p>
            <ul className="space-y-1">
              {counterparts.map((counterpart) => (
                <li key={counterpart.id}>
                  <button
                    type="button"
                    onClick={() => startConversationMutation.mutate({ counterpartId: counterpart.id })}
                    className="w-full rounded-md border px-3 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    {counterpart.firstName} {counterpart.lastName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Sohbetler</p>
          <ul className="divide-y rounded-md border">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setConversationId(conversation.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted",
                    conversationId === conversation.id && "bg-accent",
                  )}
                >
                  <span>
                    {conversation.counterpartFirstName} {conversation.counterpartLastName}
                  </span>
                  {conversation.unreadCount > 0 && <Badge>{conversation.unreadCount}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="col-span-2 flex h-[28rem] flex-col rounded-md border">
        {!conversationId ? (
          <p className="m-auto text-muted-foreground">Bir sohbet seçin veya yeni bir sohbet başlatın.</p>
        ) : (
          <>
            <div className="border-b px-4 py-2 text-sm">
              {selectedConversation ? (
                <>
                  <span className="font-medium text-foreground">
                    {selectedConversation.counterpartFirstName} {selectedConversation.counterpartLastName}
                  </span>{" "}
                  <span className="text-muted-foreground">({counterpartRoleLabel})</span>
                </>
              ) : (
                <span className="text-muted-foreground">Sohbet</span>
              )}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messagesQuery.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">Henüz mesaj yok. İlk mesajı siz yazın.</p>
              )}
              {messagesQuery.data?.map((message) => {
                const isMine = message.senderId === currentUser?.id;
                const senderName = isMine
                  ? "Siz"
                  : selectedConversation
                    ? `${selectedConversation.counterpartFirstName} ${selectedConversation.counterpartLastName}`
                    : counterpartRoleLabel;
                return (
                  <div key={message.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                    <p className="mb-0.5 text-xs text-muted-foreground">
                      {senderName}
                      {!isMine && ` · ${counterpartRoleLabel}`} · {formatMessageTime(message.createdAt)}
                    </p>
                    <div
                      className={cn(
                        "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                        isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
              <Input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Mesaj yazın..."
                className="flex-1"
              />
              <Button type="submit" disabled={sendMutation.isLoading}>
                Gönder
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
