import { requireAdmin } from "@/lib/auth/admin";
import { cache, type ReactNode } from "react";
import { getSiteSettings, listAdminPages, getEditablePage, settingsContact } from "@/lib/cms/repository";
import type { CmsPage } from "@/lib/cms/repository";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CmsPageView } from "./cms-page";

export const getEditorialPreviewContext = cache(async () => {
  await requireAdmin();
  const settings = await getSiteSettings(true);
  const originals = await listAdminPages();
  const candidates = await Promise.all(originals.filter(item => item.status === "published" || item.has_draft).map(item => getEditablePage(item.id)));
  const pages = candidates.filter(item => item && item.status !== "archived").sort((a, b) => (a?.navigation_order ?? 0) - (b?.navigation_order ?? 0));
  const links: Record<string, string> = {};
  for (const item of pages) if (item) {
    const preview = `/admin/vista-previa/paginas/${item.id}`;
    links[item.path] = preview;
    const original = originals.find(original => original.id === item.id);
    if (original) links[original.path] = preview;
  }
  const items = pages.filter(item => item?.show_in_navigation && item.path !== "/").map(item => ({ href: links[item!.path], label: item!.nav_label, groupId: item!.navigation_group ?? "recursos" }));
  items.push(...settings.navigationLinks.filter(item => item.enabled).map(item => ({ href: links[item.href] ?? item.href, label: item.label, groupId: item.groupId })));
  return { settings, items, links, pages };
});

export async function EditorialPreviewFrame({ children }: { children: ReactNode }) {
  const { settings, items, links } = await getEditorialPreviewContext();
  return <div className="public-site"><a className="skip-link" href="#main-content">Saltar al contenido</a><Header items={items} navigationGroups={settings.navigationGroups} evaluationLabel={settings.evaluationLabel} evaluationUrl={links[settings.evaluationUrl] ?? settings.evaluationUrl} whatsapp={settings.whatsapp} /><main id="main-content">{children}</main><Footer items={items} contact={settingsContact(settings)} notice={settings.footerNotice} settings={settings} /></div>;
}

export async function EditorialPreview({ page }: { page: CmsPage }) {
  const { links } = await getEditorialPreviewContext();
  return <EditorialPreviewFrame><CmsPageView page={page} preview previewLinks={links} /></EditorialPreviewFrame>;
}
