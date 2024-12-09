import "@rainbow-me/rainbowkit/styles.css";
import { Metadata } from "next";
import { Footer } from "~~/components/Footer";
import "~~/styles/globals.css";

export const metadata: Metadata = { title: "Double Zero Swap", description: "Double Zero Swap" };

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Footer />
    </>
  );
};

export default Layout;
