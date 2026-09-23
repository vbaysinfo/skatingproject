import type { Metadata } from 'next';
import { getPage } from '@/lib/server/data';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Card';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Privacy Policy' };

export default async function PrivacyPage() {
  const page = await getPage('privacy');
  return (
    <>
      <PageHero title="Privacy Policy" crumbs={[{ label: 'Privacy Policy' }]} />
      <Container className="max-w-3xl py-12"><div className="prose-content text-[16px] text-ink-soft">{(page?.content || 'Content coming soon.').split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div></Container>
    </>
  );
}
