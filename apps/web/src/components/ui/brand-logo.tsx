import Image from "next/image";

// Logo officiel PolyGest (public/brand/polygest-logo.svg) suivi du nom en texte.
// L'image est décorative : le nom de la marque est porté par le texte adjacent.
export function BrandLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].join(" ")}>
      <Image src="/brand/polygest-logo.svg" alt="" width={size} height={size} unoptimized priority />
      <span>PolyGest</span>
    </span>
  );
}
