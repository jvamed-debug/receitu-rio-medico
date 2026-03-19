"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "receituario_access_token=; path=/; max-age=0; samesite=lax";
    document.cookie = "receituario_refresh_token=; path=/; max-age=0; samesite=lax";
    document.cookie = "receituario_user=; path=/; max-age=0; samesite=lax";
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        borderRadius: 14,
        border: "1px solid #d8e2dc",
        background: "white",
        color: "var(--foreground)",
        padding: "12px 16px",
        cursor: "pointer"
      }}
    >
      Sair
    </button>
  );
}
