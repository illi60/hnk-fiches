"use client";

import type { CSSProperties, ReactNode } from "react";

interface ExternalHubLinkProps {
  href: string;
  className?: string;
  style?: CSSProperties;
  notice: string;
  children: ReactNode;
}

export default function ExternalHubLink({
  href,
  className,
  style,
  notice,
  children,
}: ExternalHubLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={(event) => {
        if (!window.confirm(notice)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </a>
  );
}
