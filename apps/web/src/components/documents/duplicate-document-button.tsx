"use client";

import { ApiClient } from "@receituario/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DuplicateDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:3333";
      const api = new ApiClient(baseUrl);
      await api.duplicateDocument(documentId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={loading}
      style={{
        borderRadius: 12,
        border: "1px solid #d8e2dc",
        background: "white",
        padding: "10px 14px",
        cursor: "pointer"
      }}
    >
      {loading ? "Duplicando..." : "Duplicar"}
    </button>
  );
}
