"use client";

import { createClient } from "@/lib/supabase/client";
import { errorText } from "@/lib/utils";
import { openConversation } from "@/lib/conversations";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Round chat button (vgen.co style) that opens or creates the conversation with this artist
export function MessageButton({
  userId,
  artistId,
  artistName,
  className,
}: {
  userId: string;
  artistId: string;
  artistName: string;
  className: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await openConversation(createClient(), userId, artistId);
      router.push(`/messages/${id}`);
    } catch (error: unknown) {
      setError(errorText(error, "An error occurred"));
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={`Message ${artistName}`}
        title="Message"
        className={className}
      >
        <MessageCircle className="size-5" />
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
