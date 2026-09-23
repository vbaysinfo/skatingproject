import type { Metadata } from 'next';
import { VerifyLookup } from '@/components/site/VerifyResult';
export const metadata: Metadata = { title: 'Verify certificate' };
export default function Page() { return <VerifyLookup kind="certificate" />; }
