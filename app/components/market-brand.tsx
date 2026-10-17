import Image from "next/image";
import Link from "next/link";

export function MarketBrand({
  light = false,
  size = 40,
  large = false,
  className = "",
}: {
  light?: boolean;
  size?: number;
  large?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="RedWhiteBlue Market home"
      className={`flex min-w-0 shrink-0 items-center gap-2 ${className}`}
    >
      <Image
        src="/images/redwhiteblue-market-logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-md object-contain"
      />
      <span className="min-w-0 leading-none">
        <span
          className={`block whitespace-nowrap font-black tracking-tight ${
            large ? "text-sm sm:text-lg" : "text-[13px] sm:text-sm"
          } ${light ? "text-white" : "text-[#08275a]"}`}
        >
          <span className="text-[#f0142f]">RedWhite</span>Blue
        </span>
        <span
          className={`mt-1 block text-[8px] font-bold uppercase tracking-[0.24em] ${
            light ? "text-blue-200" : "text-slate-500"
          }`}
        >
          Market · Liberia
        </span>
      </span>
    </Link>
  );
}
