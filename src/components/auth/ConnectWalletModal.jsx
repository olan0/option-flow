import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from './AuthContext';
import { Wallet, ShieldCheck } from 'lucide-react';

const WalletOption = ({ name, icon, onConnect, description }) => (
  <Button 
    variant="outline" 
    className="w-full h-20 flex justify-start items-center p-4 text-left border-slate-700 hover:bg-slate-700/50" 
    onClick={onConnect}
  >
    {icon}
    <div className="ml-4">
      <p className="text-lg font-semibold text-white">{name}</p>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  </Button>
);

export default function ConnectWalletModal() {
  const { isAuthModalOpen, closeAuthModal, connect } = useAuth();

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="bg-slate-800/80 backdrop-blur-xl border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Connect Wallet</DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            Choose your preferred Stacks wallet to start trading options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <WalletOption 
            name="Hiro Wallet"
            description="Most popular Stacks wallet"
            icon={<Wallet className="w-10 h-10 text-purple-400" />}
            onConnect={() => connect('hiro')}
          />
          <WalletOption 
            name="Xverse Wallet"
            description="Multi-chain Bitcoin wallet"
            icon={<ShieldCheck className="w-10 h-10 text-blue-400" />}
            onConnect={() => connect('xverse')}
          />
        </div>
        <div className="text-xs text-slate-500 text-center pt-4 space-y-2">
          <p>By connecting your wallet, you agree to the Terms of Service.</p>
          <p>No email or personal information required - wallet-only authentication.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}