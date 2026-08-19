interface PortalDimensionLogoProps {
  skateparkName?: string;
}

// Portal Dimension branding is map-only.
// The web and native map screens render the real Newport marker directly from the asset.
// Keep this legacy component as a no-op so old screen imports cannot surface the logo elsewhere.
export default function PortalDimensionLogo(_props: PortalDimensionLogoProps) {
  return null;
}
