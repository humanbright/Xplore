import "./globals.css";

import { Box } from "@chakra-ui/react";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { Inter } from "next/font/google";

import Navbar from "./components/navbar";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Xplore",
  description: "The best travel companion ever!",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers>
            <Navbar userButton={<UserButton />} />
            <Box pt="50px">{children}</Box>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
