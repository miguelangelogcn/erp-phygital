
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Do nothing while loading

    if (!user && pathname !== '/login') {
      router.push("/login");
    } else if (user && pathname === '/login') {
      router.push('/inicio');
    }
    
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If we are on the login page and there is no user, show the login page
  if (pathname === '/login' && !user) {
    return <>{children}</>;
  }
  
  // If we are on the login page and there is a user, we are about to redirect, show loader
  if (pathname === '/login' && user) {
     return (
       <div className="flex min-h-screen w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin" />
       </div>
     );
  }

  // If we are not on the login page and there is no user, we are about to redirect, show loader
  if (pathname !== '/login' && !user) {
     return (
       <div className="flex min-h-screen w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin" />
       </div>
     );
  }


  return <>{children}</>;
}
