import { useState, useCallback, useLayoutEffect, useRef } from "react";
import TopHeader from "./TopHeader.jsx";
import Header from "./Header.jsx";
import MegaMenu from "./MegaMenu.jsx";
import Footer from "./Footer.jsx";

export default function Layout({ children }) {
  const [topOffset, setTopOffset] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  const headerRef = useRef(null);

  const handleTopState = useCallback(({ offset }) => {
    setTopOffset(offset);
  }, []);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const update = () => setHeaderHeight(el.offsetHeight || 0);

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col transition-[padding-top] duration-300"
      style={{
        "--top-offset": `${topOffset}px`,
        "--header-height": `${headerHeight}px`,
        paddingTop: `${topOffset}px`,
      }}
    >
      <TopHeader onStateChange={handleTopState} />
      <Header ref={headerRef} />
      <MegaMenu />
      <main className="flex-1 py-6">{children}</main>
      <Footer />
    </div>
  );
}
