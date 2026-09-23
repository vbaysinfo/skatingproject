import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { getSettings } from '@/lib/server/data';
import { PageHero } from '@/components/site/PageHero';
import { Container, Card } from '@/components/ui/Card';
import { SocialIcons } from '@/components/site/SocialIcons';
import { ContactForm } from './ContactForm';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Contact', description: 'Contact the association office.' };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const [s, { subject }] = await Promise.all([getSettings(), searchParams]);
  const info = [
    { icon: MapPin, label: 'Address', value: s.SITE_ADDRESS },
    { icon: Phone, label: 'Phone', value: s.SITE_PHONE, href: s.SITE_PHONE ? 'tel:' + s.SITE_PHONE.replace(/\s/g, '') : '' },
    { icon: Mail, label: 'Email', value: s.SITE_EMAIL, href: s.SITE_EMAIL ? 'mailto:' + s.SITE_EMAIL : '' },
    { icon: Clock, label: 'Office hours', value: s.OFFICE_HOURS },
  ].filter((i) => i.value);
  return (
    <>
      <PageHero eyebrow="Get in touch" title="Contact us" subtitle="Questions about events, membership, certification or partnerships? We’re here to help." crumbs={[{ label: 'Contact' }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <ul className="space-y-5">
              {info.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="size-5" aria-hidden /></span>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
                    {href ? <a href={href} className="font-semibold hover:text-brand-700">{value}</a> : <p className="whitespace-pre-line font-semibold">{value}</p>}</div>
                </li>
              ))}
            </ul>
            <SocialIcons settings={s} className="mt-6" />
          </Card>
          {s.GOOGLE_MAP_URL && (
            <Card className="overflow-hidden">
              <iframe src={s.GOOGLE_MAP_URL} title="Association location map" className="h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </Card>
          )}
        </div>
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-3xl font-extrabold uppercase">Send a message</h2>
          <p className="mt-1 text-sm text-muted">We usually reply within two working days.</p>
          <ContactForm initialSubject={subject || ''} />
        </Card>
      </Container>
    </>
  );
}
