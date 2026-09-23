import { Container } from '@/components/ui/Card';
import { CardSkeletonGrid, Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <>
      <div className="bg-ink py-20"><Container><Skeleton className="h-14 w-64 opacity-20" /></Container></div>
      <Container className="py-12"><CardSkeletonGrid /></Container>
    </>
  );
}
