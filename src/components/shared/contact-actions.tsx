import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { ContactAction } from "@/types/site";

const icons = {
  phone: Phone,
  message: MessageCircle,
  mail: Mail,
  map: MapPin,
};

type ContactActionLinkProps = {
  action: ContactAction;
  variant?: "primary" | "inverted" | "accent";
  className?: string;
};

export function ContactActionLink({
  action,
  variant = "primary",
  className,
}: ContactActionLinkProps) {
  const Icon = icons[action.icon];
  const external = action.href.startsWith("http");

  return (
    <a
      className={buttonVariants({ className, variant })}
      href={action.href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      <Icon aria-hidden="true" className="size-4" />
      {action.label}
    </a>
  );
}

export function ContactActions({
  actions,
  variant = "primary",
}: {
  actions: ContactAction[];
  variant?: "primary" | "inverted";
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <ContactActionLink action={action} key={action.label} variant={variant} />
      ))}
    </div>
  );
}
