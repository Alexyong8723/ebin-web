"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui";
export default function Root() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/auth/login");
  }, [user, isAdmin, loading, router]);
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner/></div>;
}
