"use client";
import { useState } from "react";

export function RoleIcon({
  roleId,
  size = 40,
  className = "",
}: {
  roleId: string;
  size?: number;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <>
      {state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://raw.githubusercontent.com/bra1n/townsquare/main/src/assets/icons/${roleId}.png`}
          alt=""
          width={size}
          height={size}
          className={`object-contain ${state === "loading" ? "opacity-0 absolute" : ""} ${className}`}
          onLoad={() => setState("ok")}
          onError={() => setState("failed")}
        />
      )}
    </>
  );
}
