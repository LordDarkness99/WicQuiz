"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export function AosInitializer() {
  useEffect(() => {
    AOS.init({
      once: true,
      easing: "ease-out-cubic",
      duration: 800,
      offset: 50,
    });
  }, []);

  return null;
}
