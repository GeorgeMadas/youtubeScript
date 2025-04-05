import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SearchHistoryProvider } from "@/lib/contexts/SearchHistoryContext";

export const metadata = {
  title: "DeepContent",
  description: "Research-backed content creation for educational, news, political, and pop culture",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex">
        <SearchHistoryProvider>
          <Sidebar />
          <div className="flex-1 overflow-y-auto pl-[260px]">
            {children}
          </div>
        </SearchHistoryProvider>
      </body>
    </html>
  );
}
