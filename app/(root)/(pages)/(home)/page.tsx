import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Інструменти для PDF",
  description: "Ознайомтесь з професійними інструментами для роботи з PDF",
};

const tools = [
  {
    id: 1,
    title: "Створення горизонтального фотозвіту у PDF",
    link: "/sort-photo",
  },
  {
    id: 2,
    title: "Створення вертикального фотозвіту у PDF",
    link: "/sort-photo-vertical",
  },
];

export default function Home() {
  return (
    <div>
      <section className="py-20 px-5 bg-[#1a2a44] text-white text-center">
        <h1 className="text-4xl mb-5 text-shadow-2xs">Інструменти для PDF</h1>
        <p className="text-xl m-auto text-shadow-xs">
          Ознайомтесь з професійними інструментами для роботи з PDF
        </p>
      </section>

      <div className="max-w-4xl m-auto flex justify-between flex-wrap mt-12 px-4">
        {tools.map((tool) => (
          <Link
            href={tool.link}
            key={tool.id}
            className="border border-[#1a2a44] rounded-lg p-5 hover:bg-[#1a2a44] hover:text-white transition duration-300 ease-in-out"
          >
            <h3 className="font-semibold">{tool.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
