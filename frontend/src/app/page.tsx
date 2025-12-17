import ProxyVaultForm from '@/components/ProxyVaultForm';
import VaultList from '@/components/VaultList';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Upgradable Proxy Vaults
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Create upgradable vaults with sequential rule execution. Deploy on localhost, test on Fuji.
        </p>
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-full border border-blue-500/30 mt-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-blue-300">Using New Proxy System (EIP-1167)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
          <ProxyVaultForm />
        </div>
        <div className="lg:col-span-2">
          <VaultList />
        </div>
      </div>
    </div>
  );
}
