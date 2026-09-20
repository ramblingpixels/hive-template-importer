type IconProps = { className?: string };

export function ArrowIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>;
}

export function UploadIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" /></svg>;
}

export function CheckIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>;
}

export function CopyIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="10" height="10" rx="2" /><path d="M13 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1" /></svg>;
}

export function FileIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h6l4 4v11H5z" /><path d="M11 2.5v4h4M7.5 10h5M7.5 13h5" /></svg>;
}

export function AlertIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 18 17H2z" /><path d="M10 7v4.5M10 14.2v.2" /></svg>;
}

export function ShieldIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 16 5v4.5c0 3.8-2.3 6.5-6 8-3.7-1.5-6-4.2-6-8V5z" /><path d="m7 10 2 2 4-4" /></svg>;
}

export function ChevronIcon({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>;
}

