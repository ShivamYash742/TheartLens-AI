import EDADashboard from "@/components/eda/EDADashboard";

export const metadata = {
  title: "EDA Analytics | ThreatLens AI",
  description: "Upload CSV or JSON log files to explore data visually — timeseries, distributions, heatmaps, and more.",
};

export default function EDAPage() {
  return <EDADashboard />;
}
