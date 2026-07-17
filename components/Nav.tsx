"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const STEPS = [
  { href: "/upload", label: "CV" },
  { href: "/swipe", label: "Explore" },
  { href: "/preferences", label: "Preferences" },
  { href: "/jobs", label: "Jobs" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-blue-600 text-base">DR.Job</span>
        <div className="hidden sm:flex items-center gap-1">
          {STEPS.map((step) => (
            <Link
              key={step.href}
              href={step.href}
              className={`px-3 py-1 rounded text-sm ${
                pathname.startsWith(step.href)
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {step.label}
            </Link>
          ))}
          <Link
            href="/saved"
            className={`px-3 py-1 rounded text-sm ${
              pathname.startsWith("/saved")
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Saved
          </Link>
        </div>
      </div>
      <button
        onClick={logout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </nav>
  );
}
