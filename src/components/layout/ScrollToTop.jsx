import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll the window to top
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    const scrollContainers = document.querySelectorAll(
      "[data-scroll-container]"
    );
    scrollContainers.forEach((container) => {
      container.scrollTop = 0;
    });

    // Fallback: scroll any element with overflow auto/scroll
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
