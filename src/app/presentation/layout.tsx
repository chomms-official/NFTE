import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SENT SCENT",
  description: "Natural Mosquito Repellent from Earl Grey Garden",
};

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
