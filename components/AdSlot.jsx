"use client";

export default function AdSlot({ label = "Ad space" }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

  if (!client || !slot) {
    return (
      <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-line text-xs text-mist">
        {label} — AdSense configure karne ke baad yahan live ad chalegi
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle block h-16"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
