import { PracticeStartPanel } from "@/components/practice/PracticeStartPanel";

type PracticeStartPageProps = {
  params: Promise<{
    scenarioSlug: string;
  }>;
};

export default async function PracticeStartPage({ params }: PracticeStartPageProps) {
  const { scenarioSlug } = await params;

  return <PracticeStartPanel scenarioSlug={scenarioSlug} />;
}
