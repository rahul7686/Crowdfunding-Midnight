import type { ReactNode } from "react";

import { formatTNight } from "../format";
import type { CampaignStats } from "../types";
import {
  ActivityIcon,
  CoinsIcon,
  EyeOffIcon,
  LayoutIcon,
  RocketIcon,
} from "./icons";

interface StatsProps {
  stats: CampaignStats | null;
}

export function Stats({ stats }: StatsProps) {
  const totalCampaigns = stats === null ? "--" : stats.totalCampaigns.toLocaleString("en-US");
  const activeCampaigns = stats === null ? "--" : stats.activeCampaigns.toLocaleString("en-US");
  const totalRaised = stats === null ? "--" : `${formatTNight(stats.totalRaised)} tNIGHT`;
  const privateDonations =
    stats === null ? "--" : stats.totalDonations.toLocaleString("en-US");  // No on-chain counter of generated proofs is available to the frontend, so
  // this statistic is intentionally a placeholder rather than invented data.
  const proofsVerified = "N/A";

  const cards: Array<{ icon: ReactNode; label: string; value: string }> = [
    { icon: <RocketIcon />, label: "Total Campaigns", value: totalCampaigns },
    { icon: <ActivityIcon />, label: "Active Campaigns", value: activeCampaigns },
    { icon: <CoinsIcon />, label: "Total Raised", value: totalRaised },
    { icon: <EyeOffIcon />, label: "Private Donations", value: privateDonations },
    { icon: <LayoutIcon />, label: "ZK Proofs Verified", value: proofsVerified },
  ];

  return (
    <section className="stats" aria-label="Platform statistics">
      <div className="stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-body">
              <span className="stat-value">{card.value}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
