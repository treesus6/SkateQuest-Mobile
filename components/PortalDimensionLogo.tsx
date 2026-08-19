// Portal Dimension branding is map-only.
// The Newport marker in MapScreen.web.tsx renders the logo directly from the asset.
// Keep this legacy component as a no-op so old screen imports cannot surface the logo elsewhere.
type PortalDimensionLogoProps = {
  skateparkName?: string;
};

export default function PortalDimensionLogo(_props: PortalDimensionLogoProps) {
  return null;
}
