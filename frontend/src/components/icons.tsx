import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function LogoShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5 4.5 5.5v5.3c0 4.6 3.2 8.4 7.5 10.2 4.3-1.8 7.5-5.6 7.5-10.2V5.5L12 2.5Z"
        fill="url(#logo-grad)"
      />
      <path
        d="m8.8 11.8 2.1 2.1 4.3-4.6"
        stroke="#fff"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M12 3 4.5 6v5.2c0 4.4 3.1 8.1 7.5 9.8 4.4-1.7 7.5-5.4 7.5-9.8V6L12 3Z" />
      <path d="m9 11.6 2.2 2.2 3.8-4" />
    </svg>
  );
}

export function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M12 3 4.5 6v5.2c0 4.4 3.1 8.1 7.5 9.8 4.4-1.7 7.5-5.4 7.5-9.8V6L12 3Z" />
      <path d="m9.2 12.2 2 2 3.6-4" />
    </svg>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </svg>
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c5 0 8.5 3.5 10 7a16.6 16.6 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6A16 16 0 0 0 2 12c1.5 3.5 5 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function ChainIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.6L11.5 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.6l1.5-1.6" />
    </svg>
  );
}

export function NodesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <circle cx="12" cy="5" r="2.4" />
      <circle cx="5" cy="18" r="2.4" />
      <circle cx="19" cy="18" r="2.4" />
      <path d="M11 7.2 6 15.8M13 7.2l5 8.6M7.4 17h9.2" />
    </svg>
  );
}

export function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    </svg>
  );
}

export function CoinsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7" ry="2.8" />
      <path d="M5 6.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" />
      <path d="M5 11.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" />
    </svg>
  );
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <path d="M12 8.5 13.3 11l2.5 1-2.5 1L12 15.5 10.7 13l-2.5-1 2.5-1L12 8.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M15.5 14.5h2" />
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8v.01" />
    </svg>
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 3v.01" />
    </svg>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.6L11.5 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.6l1.5-1.6" />
    </svg>
  );
}

export function LayoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 9.5V20" />
    </svg>
  );
}

export function RocketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M4.5 16.5c-1 1.2-1.5 3-1 5 2 .5 3.8 0 5-1l1.5-1.4" />
      <path d="M9 8.5C10.5 4 14 2 14 2s1.6 3.5 0 7" />
      <path d="M15.5 15.5c4.5-1.5 6.5-5 6.5-5s-3.5-1.6-7 0" />
      <path d="M14 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
