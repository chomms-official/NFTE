import OutbreakGlobe from "@/components/ui/outbreak-globe";

export default function SimulatorPage() {
  return (
    <main data-app="mozziemap" className="w-screen h-[100dvh] bg-black overflow-hidden m-0 p-0 flex">
      <h1 className="sr-only">Global mosquito outbreak simulator</h1>
      <OutbreakGlobe />
    </main>
  );
}
