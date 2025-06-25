import { Metadata } from "next";
import { FirstVisitExplanation } from "~~/components/FirstVisitExplanation";
import { Footer } from "~~/components/Footer";
import "~~/styles/globals.css";

export const metadata: Metadata = {
  title: "ZKsync Prividium Intraday Repo",
  description: "ZKsync Prividium Intraday Repo Demo",
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <FirstVisitExplanation>
      {children}
      <Footer />
    </FirstVisitExplanation>
  );
};

export default Layout;
