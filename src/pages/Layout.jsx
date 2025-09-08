import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Rocket, Wallet, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import ConnectWalletModal from "@/components/auth/ConnectWalletModal";

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-white ${
        isActive ? "text-white" : "text-slate-400"
      }`}
    >
      {children}
    </Link>
  );
}

function MainLayout({ children }) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, userAddress, openAuthModal, disconnect } = useAuth();

  const truncateAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white">
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-blue-400" />
              <span className="font-bold text-lg">OptionFlow</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              <NavLink to={createPageUrl("Dashboard")}>Dashboard</NavLink>
              <NavLink to={createPageUrl("Trade")}>Trade</NavLink>
              <NavLink to={createPageUrl("Portfolio")}>Portfolio</NavLink>
              <NavLink to={createPageUrl("StrategyAnalyzer")}>Analyzer</NavLink>
              <NavLink to={createPageUrl("Contract")}>Contract</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Wallet className="w-4 h-4 mr-2" />
                    {truncateAddress(userAddress)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                  <DropdownMenuItem onClick={disconnect} className="cursor-pointer hover:!bg-slate-700">
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={openAuthModal} className="hidden md:flex" variant="outline" size="sm">
                Connect Wallet
              </Button>
            )}
            
            <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-900 border-slate-800 text-white">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                     <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                        <Rocket className="h-6 w-6 text-blue-400" />
                        <span className="font-bold text-lg">OptionFlow</span>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}>
                        <X className="h-6 w-6" />
                      </Button>
                  </div>
                  <nav className="flex flex-col gap-6 mt-8 text-lg">
                    <Link to={createPageUrl("Dashboard")} onClick={() => setMenuOpen(false)} className="hover:text-blue-400">Dashboard</Link>
                    <Link to={createPageUrl("Trade")} onClick={() => setMenuOpen(false)} className="hover:text-blue-400">Trade</Link>
                    <Link to={createPageUrl("Portfolio")} onClick={() => setMenuOpen(false)} className="hover:text-blue-400">Portfolio</Link>
                    <Link to={createPageUrl("StrategyAnalyzer")} onClick={() => setMenuOpen(false)} className="hover:text-blue-400">Analyzer</Link>
                    <Link to={createPageUrl("Contract")} onClick={() => setMenuOpen(false)} className="hover:text-blue-400">Contract</Link>
                  </nav>
                  <div className="mt-auto">
                  {isAuthenticated ? (
                     <Button onClick={() => {disconnect(); setMenuOpen(false);}} variant="outline" className="w-full">
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                  ) : (
                    <Button onClick={() => {openAuthModal(); setMenuOpen(false);}} className="w-full">
                      Connect Wallet
                    </Button>
                  )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="container mx-auto">
          {children}
      </main>
      <ConnectWalletModal />
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <MainLayout>{children}</MainLayout>
    </AuthProvider>
  );
}