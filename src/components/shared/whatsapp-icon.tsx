import type { SVGProps } from "react";

/** A compact, high-contrast WhatsApp mark rendered locally; no SDK or remote asset. */
export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32" {...props}>
      <path
        d="M27.2 4.8A15.5 15.5 0 0 0 3.7 25.2L2.4 29.6l4.6-1.2A15.5 15.5 0 1 0 27.2 4.8Z"
        fill="currentColor"
      />
      <path
        d="M23.5 19.5c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.4.2-4.5-1.1-3.9-1.6-6.4-5.5-6.6-5.8-.2-.3-1.6-2.1-1.6-4s1-2.9 1.4-3.3c.4-.4.8-.5 1.1-.5h.8c.3 0 .6.1.8.6l1 2.5c.1.3.1.6 0 .8l-.5.7c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.3 2.5 1.7 2.9 1.9.3.2.5.1.7-.1l.9-1.1c.2-.2.5-.3.8-.2l2.6 1.2c.4.2.6.3.7.5.1.2.1 1.1-.2 2Z"
        fill="var(--whatsapp-mark, #fff)"
      />
    </svg>
  );
}
