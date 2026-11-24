import { Info, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type NoticeProps = Omit<React.ComponentProps<"aside">, "title"> & {
  tone?: "info" | "warning";
  title?: string;
};

/** Contextual message (for example the Recovery 90 status). Full border, tint and icon. */
export function Notice({ tone = "info", title, className, children, ...props }: NoticeProps) {
  const Icon = tone === "warning" ? ShieldAlert : Info;
  return (
    <aside className={cn("ds-notice", tone === "warning" && "ds-notice--warning", className)} {...props}>
      <Icon aria-hidden="true" className="ds-notice__icon" size={22} />
      <div>
        {title && <h2 className="ds-notice__title">{title}</h2>}
        <div className="ds-notice__body">{children}</div>
      </div>
    </aside>
  );
}
