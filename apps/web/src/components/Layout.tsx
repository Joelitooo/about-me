import { Outlet } from "react-router";

import { Footer } from "./Footer.js";
import { Navbar } from "./Navbar.js";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
