import type { Metadata } from "next";
import { meta } from "../seo-config";

export const metadata: Metadata = meta({
  title: "Online Data Analysis Tool — CSV & Excel Charts & Statistics",
  description:
    "Analyse CSV and Excel files online with interactive charts, statistical summaries, data merging, and dashboards. Free online data analysis utility — no installation needed.",
  keywords: [
    "online data analysis tool",
    "csv analysis online",
    "excel analysis tool",
    "online charts",
    "data visualisation online",
    "statistical analysis tool",
    "merge csv files",
    "online spreadsheet analysis",
    "data dashboard online",
    "plotly charts online",
    "correlation heatmap",
    "box plot online",
    "histogram generator",
    "online data utility",
  ],
  path: "/analyze/",
});

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
