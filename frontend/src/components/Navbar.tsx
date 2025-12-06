'use client';

import { ConnectButton } from "@rainbow-me/rainbowkit";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                                <span className="text-white font-bold text-lg">V</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                CrossChain Vault
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-1">
                            <Link
                                href="/"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/')
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Vaults
                            </Link>
                            <Link
                                href="/faucet"
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/faucet')
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Faucet
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ConnectButton
                            accountStatus={{
                                smallScreen: 'avatar',
                                largeScreen: 'full',
                            }}
                            showBalance={{
                                smallScreen: false,
                                largeScreen: true,
                            }}
                        />
                    </div>
                </div>
            </div>
        </nav>
    );
}
