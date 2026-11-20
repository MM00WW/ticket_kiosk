import { notFound } from "next/navigation";
import { QueueApp } from "@/components/queue-app";
export default async function Operator({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-4]$/.test(id)) notFound();
  return <QueueApp page="operator" windowId={Number(id)} />;
}
