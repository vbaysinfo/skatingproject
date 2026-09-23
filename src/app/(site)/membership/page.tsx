import type { Metadata } from 'next';
import { ShieldCheck, QrCode, IdCard, Trophy } from 'lucide-react';
import { getPlans } from '@/lib/server/data';
import { PageHero } from '@/components/site/PageHero';
import { Container, SectionHeading } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { PlanCard } from '@/components/membership/PlanCard';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Membership', description: 'Membership plans for students, athletes, coaches, officials and academies.' };

export default async function MembershipPage() {
  const plans = await getPlans();
  const steps = [
    { icon: IdCard, title: 'Choose a plan', text: 'Select the membership that fits you.' },
    { icon: ShieldCheck, title: 'Profile & documents', text: 'Log in, confirm your profile and upload documents.' },
    { icon: Trophy, title: 'Pay & get approved', text: 'Pay online or at the office. We verify and approve.' },
    { icon: QrCode, title: 'Digital card', text: 'Receive your MEM number and a QR-verifiable card.' },
  ];
  return (
    <>
      <PageHero eyebrow="Join" title="Membership" subtitle="Official membership for athletes, coaches, officials and academies — with a digital ID you can verify anywhere." crumbs={[{ label: 'Membership' }]} />
      <Container className="py-14">
        {!plans ? <ErrorState /> : plans.length ? (
          <div className="grid gap-8 pt-3 md:grid-cols-2 lg:grid-cols-3">{plans.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
        ) : <EmptyState title="Membership plans coming soon" message="Please check back shortly or contact the office." />}
      </Container>
      <section className="bg-surface py-16">
        <Container>
          <SectionHeading align="center" eyebrow="How it works" title="Four simple steps" />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-line/70">
                <span className="font-display text-5xl font-extrabold text-brand-100">0{i + 1}</span>
                <Icon className="mt-2 size-7 text-accent-500" aria-hidden />
                <h3 className="mt-3 font-display text-xl font-bold uppercase">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
