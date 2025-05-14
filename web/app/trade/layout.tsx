import { Metadata } from "next";
import { Footer } from "~~/components/Footer";
import "~~/styles/globals.css";

export const metadata: Metadata = {
  title: "ZKsync Prividium Escrow Trade",
  description: "ZKsync Prividium Escrow Trade Demo",
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Footer />
    </>
  );
};

export default Layout;
