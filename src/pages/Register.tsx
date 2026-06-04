import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/login"); }, []);
  return null;
}
