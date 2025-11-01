"use client";
import Link from "next/link";

export const Header = () => {
  return (
    <header className="bg-[#1a2a44] text-gray-100 py-5 px-10 flex justify-between items-center sticky top-0 z-50 shadow-2xl">
      <div className="font-bold text-2xl">
        <Link href="/">Мої Інструменти</Link>
      </div>
    </header>
  );
};
