import type { Metadata } from 'next';
import { VerifyLookup } from '@/components/site/VerifyResult';
export const metadata: Metadata = { title: 'Verify membership' };
export default function Page() { return <VerifyLookup kind="member" />; }
