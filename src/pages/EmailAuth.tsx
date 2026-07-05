import { useEffect } from "react";
import { useLocation } from "wouter";

/** EmailAuth has been merged into the main Login page. Redirect anyone who lands here. */
export default function EmailAuth() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/login"); }, []);
  return null;
}
