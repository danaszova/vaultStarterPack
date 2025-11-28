'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-8 w-8 text-blue-500" />
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Cross-Chain Vault
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <ConnectButton
                            accountStatus="address"
                            chainStatus="icon"
                            showBalance={false}
                        />
                    </div>
                </div>
            </div>
        </nav>
    );
}
