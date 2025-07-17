// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { User as FirebaseUser } from "firebase/auth";
import type { User as AppUser } from "@/types/user";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: FirebaseUser | null;
  userData: AppUser | null;
  loading: boolean;
  error: Error | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, authLoading, authError] = useAuthState(auth);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(authError);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(undefined);

      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const teamsCollectionRef = collection(db, "teams");

          const userDocPromise = getDoc(userDocRef);
          const teamQuery = query(teamsCollectionRef, where("leaderId", "==", user.uid));
          const teamQueryPromise = getDocs(teamQuery);
          
          const [userDocSnap, teamSnapshot] = await Promise.all([userDocPromise, teamQueryPromise]);

          if (userDocSnap.exists()) {
              const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as AppUser;
              appUser.isLeader = !teamSnapshot.empty; // User is a leader if they lead at least one team
              setUserData(appUser);
          } else {
            setError(new Error("Dados do usuário não encontrados no Firestore."));
            setUserData(null);
          }
        } catch (e: any) {
          setError(new Error("Falha ao buscar dados do usuário."));
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading]);

  // Combined loading state
  const combinedLoading = authLoading || loading;

  if (combinedLoading) {
     return (
       <div className="flex min-h-screen w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin" />
       </div>
     );
  }

  const value = {
    user,
    userData,
    loading: combinedLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};