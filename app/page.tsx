import Image from "next/image";
import Link from "next/link";
import { Trophy, Banknote, Users, Calendar, HelpCircle, Image as ImageIcon, Settings, LogOut } from "lucide-react";

export default function Home() {
  const menuItems = [
    { name: "Scores", icon: Trophy, href: "/scores", color: "text-amber-500" },
    { name: "$5 Pool", icon: Banknote, href: "/pool", color: "text-green-500" },
    { name: "Players", icon: Users, href: "/players", color: "text-blue-500" },
    { name: "Events", icon: Calendar, href: "#", color: "text-purple-500" },
    { name: "FAQ's", icon: HelpCircle, href: "/faq", color: "text-orange-500" },
    { name: "Photos", icon: ImageIcon, href: "/photos", color: "text-pink-500" },
    { name: "Settings", icon: Settings, href: "/settings", color: "text-gray-500" },
  ];

  return (
    <div className="min-h-screen relative flex flex-col font-sans">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/background-final.jpg"
          alt="Golf Club Group"
          fill
          className="object-cover brightness-50"
          priority
        />
      </div>



      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start text-center px-4 pb-10 w-full max-w-full pt-10">

        {/* Hero Text */}
        <div className="mb-12 space-y-4 w-full">

          <h1 className="text-[32pt] sm:text-[50pt] font-extrabold text-white drop-shadow-xl tracking-tight leading-[1.1] sm:leading-tight w-full mt-10">
            <span className="relative inline-block">
              C
              <span className="absolute bottom-1 left-0 w-full h-[3px] sm:h-[5px] bg-red-600 rounded-sm"></span>
            </span>
            ity{" "}
            <span className="relative inline-block">
              P
              <span className="absolute bottom-1 left-0 w-full h-[3px] sm:h-[5px] bg-red-600 rounded-sm"></span>
            </span>
            ark{" "}
            <span className="relative inline-block">
              G
              <span className="absolute bottom-1 left-0 w-full h-[3px] sm:h-[5px] bg-red-600 rounded-sm"></span>
            </span>
            olf{" "}
            <span className="relative inline-block">
              C
              <span className="absolute bottom-1 left-0 w-full h-[3px] sm:h-[5px] bg-red-600 rounded-sm"></span>
            </span>
            lub{" "}
            of New Orleans
          </h1>
          <div className="flex flex-col gap-1 text-shadow-md w-full">
            <p className="text-white text-[14pt] sm:text-[18pt] font-semibold drop-shadow-md leading-relaxed w-full">
              Teeing off sunrise every Saturday at Bayou Oaks City Park Golf North Course.
            </p>
            <p className="text-white/80 text-[14pt] sm:text-[18pt] mt-1 drop-shadow-sm font-medium w-full">
              1040 Filmore Ave, New Orleans, LA 70124.
            </p>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-3 gap-2 w-full px-1 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="bg-white rounded-xl shadow-lg p-2 sm:p-4 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-200 sm:w-[140px] h-[85px] sm:h-[100px]"
              >
                <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${item.color}`} />
                <span className="text-gray-900 font-bold text-[10pt] sm:text-[14pt] whitespace-nowrap">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-white/60 text-[12pt] sm:text-[14pt] space-y-1">
          <p className="font-bold text-white">CPGC.app</p>
          <p>Last updated: December 23, 2025</p>
          <p>100% Custom app by: Vchu.app</p>
          <p>Question: Info@Vchu.app</p>
        </div>

      </main>
    </div>
  );
}
