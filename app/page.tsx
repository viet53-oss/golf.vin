import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import BirthdayPopup from "@/components/BirthdayPopup";

const Trophy = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const Users = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="18" cy="4" r="3" />
  </svg>
);

const Calendar = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const HelpCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" x2="12.01" y1="17" y2="17" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);


export default async function Home() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_session')?.value === 'true';

  // Fetch players strictly for birthday check
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      birthday: true,
    }
  });

  const menuItems = [
    { name: "Live Score", icon: Activity, href: "/live", color: "text-red-500" },
    { name: "Scores", icon: Trophy, href: "/scores", color: "text-amber-500" },
    { name: "Players", icon: Users, href: "/players", color: "text-blue-500" },
    { name: "Schedule", icon: Calendar, href: "/schedule", color: "text-purple-500" },

    { name: "FAQ's", icon: HelpCircle, href: "/faq", color: "text-orange-500" },
    { name: "Photos", icon: ImageIcon, href: "/photos", color: "text-pink-500" },
    { name: "Settings", icon: SettingsIcon, href: "/settings", color: "text-gray-500" },
  ];


  return (
    <div className="min-h-screen relative flex flex-col font-sans">
      <BirthdayPopup players={players} />

      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/golf-club-group.jpg"
          alt="Golf Club Group"
          fill
          className="object-cover object-top brightness-50"
          priority
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start text-center px-1 pb-10 w-full max-w-full pt-10">

        {/* Hero Text */}
        <div className="mb-12 space-y-4 w-full">

          <h1 className="text-[30pt] md:text-[40pt] font-extrabold text-white drop-shadow-xl tracking-tight leading-[1.1] w-full mt-10">
            Golf Live Score
          </h1>
          <div className="flex flex-col gap-1 text-shadow-md w-full">
            <p className="text-white text-[14pt] font-semibold drop-shadow-md leading-relaxed w-full">
              Teeing off sunrise every Saturday at Bayou Oaks City Park Golf North Course.
            </p>
            <p className="text-white/80 text-[14pt] mt-1 drop-shadow-sm font-medium w-full">
              1040 Filmore Ave, New Orleans, LA 70124.
            </p>
          </div>
        </div>

        {/* Live Score Button - Centered on its own line */}
        <div className="w-full flex justify-center mb-2 px-1">
          {menuItems.filter(item => item.name === "Live Score").map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="bg-white rounded-xl shadow-lg p-2 sm:p-4 flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform duration-200 w-full sm:w-[444px] h-[100px] sm:h-[115px]"
              >
                <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${item.color}`} />
                <span className="text-gray-900 font-bold text-[18pt] whitespace-nowrap">{item.name}</span>
                <span className="text-gray-900 text-[12pt] italic font-medium text-center px-2">
                  (Is isolated from club rounds, so play all you want.)
                </span>
              </Link>
            )
          })}
        </div>

        {/* Menu Grid - Remaining Items (3 per line) */}
        <div className="grid grid-cols-3 gap-2 w-full px-1 sm:flex sm:flex-wrap sm:justify-center">
          {menuItems.filter(item => item.name !== "Live Score").map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="bg-white rounded-xl shadow-lg p-2 sm:p-4 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-200 sm:w-[140px] h-[85px] sm:h-[100px]"
              >
                <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${item.color}`} />
                <span className="text-gray-900 font-bold text-[14pt] whitespace-nowrap">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-white/60 text-[14pt] space-y-1">
          <p className="font-bold text-white">CPGC.app</p>
          <p>Custom app by: Vchu.app</p>
          <p>Question: Info@Vchu.app</p>
        </div>

      </main>
    </div>
  );
}
