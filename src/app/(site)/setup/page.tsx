import type { Metadata } from 'next';
import { SetupWizard } from './SetupWizard';

export const metadata: Metadata = { title: 'Setup wizard', robots: { index: false } };
export default function SetupPage() { return <SetupWizard />; }
